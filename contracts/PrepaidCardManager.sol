// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FireCoin.sol";
import "./LiquidityPool.sol";

contract PrepaidCardManager is Ownable, ReentrancyGuard {
    enum Phase {
        SHIP_FIRST,
        PAY_SECOND,
        COIN_ISSUED,
        LISTING_ACTIVE,
        TRIAL_ENDED,
        BACKING_CHECK,
        SELL_SEVERANCE,
        REFUNDED
    }

    struct Card {
        address owner;
        uint256 cardId;
        uint256 balance;
        uint256 spentAmount;
        uint256 fireCoinEarned;
        Phase phase;
        uint256 trialEndsAt;
        bool liquidityBacked;
        uint256 severancePaid;
        uint256 originalPayment;
    }

    FireCoin public fireCoin;
    LiquidityPool public liquidityPool;

    uint256 public nextCardId;
    mapping(uint256 => Card) public cards;
    mapping(address => uint256[]) public userCards;

    uint256 public constant TRIAL_DURATION = 30 days;
    uint256 public constant SEVERANCE_PERCENT = 10;
    uint256 public constant TOKENS_PER_WEI = 1000;

    event CardIssued(uint256 indexed cardId, address indexed owner, uint256 balance);
    event SpendRecorded(uint256 indexed cardId, uint256 amount, uint256 newSpentAmount);
    event PaymentProcessed(uint256 indexed cardId, uint256 paymentAmount, uint256 tokensMinted);
    event ListingActivated(uint256 indexed cardId, uint256 trialEndsAt);
    event TrialEnded(uint256 indexed cardId, uint256 tokensReturned);
    event BackingChecked(uint256 indexed cardId, bool isBacked);
    event SeverancePaid(uint256 indexed cardId, uint256 severanceAmount);
    event RefundClaimed(uint256 indexed cardId, uint256 refundAmount);
    event PhaseAdvanced(uint256 indexed cardId, Phase from, Phase to);

    constructor(address _fireCoin, address _liquidityPool) Ownable(msg.sender) {
        fireCoin = FireCoin(_fireCoin);
        liquidityPool = LiquidityPool(_liquidityPool);
        nextCardId = 1;
    }

    modifier cardExists(uint256 cardId) {
        require(cards[cardId].owner != address(0), "Card does not exist");
        _;
    }

    modifier onlyCardOwner(uint256 cardId) {
        require(cards[cardId].owner == msg.sender || msg.sender == owner(), "Not card owner");
        _;
    }

    function issueCard(address to, uint256 balance) external onlyOwner returns (uint256 cardId) {
        cardId = nextCardId++;
        cards[cardId] = Card({
            owner: to,
            cardId: cardId,
            balance: balance,
            spentAmount: 0,
            fireCoinEarned: 0,
            phase: Phase.SHIP_FIRST,
            trialEndsAt: 0,
            liquidityBacked: false,
            severancePaid: 0,
            originalPayment: 0
        });
        userCards[to].push(cardId);
        emit CardIssued(cardId, to, balance);
        return cardId;
    }

    function recordSpend(uint256 cardId, uint256 amount) external cardExists(cardId) onlyCardOwner(cardId) {
        Card storage card = cards[cardId];
        require(card.phase == Phase.SHIP_FIRST, "Card not in SHIP_FIRST phase");
        require(card.spentAmount + amount <= card.balance, "Exceeds card balance");
        card.spentAmount += amount;
        emit SpendRecorded(cardId, amount, card.spentAmount);
        if (card.spentAmount > 0) {
            Phase oldPhase = card.phase;
            card.phase = Phase.PAY_SECOND;
            emit PhaseAdvanced(cardId, oldPhase, Phase.PAY_SECOND);
        }
    }

    function processPayment(uint256 cardId) external payable cardExists(cardId) onlyCardOwner(cardId) nonReentrant {
        Card storage card = cards[cardId];
        require(card.phase == Phase.PAY_SECOND, "Card not in PAY_SECOND phase");
        require(msg.value >= card.spentAmount, "Insufficient payment");

        card.originalPayment = msg.value;
        uint256 tokenAmount = msg.value * TOKENS_PER_WEI;
        card.fireCoinEarned = tokenAmount;

        fireCoin.mint(card.owner, tokenAmount, cardId);
        liquidityPool.addLiquidity(card.owner, tokenAmount);

        Phase oldPhase = card.phase;
        card.phase = Phase.COIN_ISSUED;
        emit PaymentProcessed(cardId, msg.value, tokenAmount);
        emit PhaseAdvanced(cardId, oldPhase, Phase.COIN_ISSUED);
    }

    function activateListing(uint256 cardId) external cardExists(cardId) onlyCardOwner(cardId) {
        Card storage card = cards[cardId];
        require(card.phase == Phase.COIN_ISSUED, "Card not in COIN_ISSUED phase");

        card.trialEndsAt = block.timestamp + TRIAL_DURATION;
        Phase oldPhase = card.phase;
        card.phase = Phase.LISTING_ACTIVE;
        emit ListingActivated(cardId, card.trialEndsAt);
        emit PhaseAdvanced(cardId, oldPhase, Phase.LISTING_ACTIVE);
    }

    function endTrial(uint256 cardId) external cardExists(cardId) {
        Card storage card = cards[cardId];
        require(card.phase == Phase.LISTING_ACTIVE, "Card not in LISTING_ACTIVE phase");
        require(block.timestamp >= card.trialEndsAt, "Trial period not yet ended");

        uint256 tokensReturned = card.fireCoinEarned;
        Phase oldPhase = card.phase;
        card.phase = Phase.TRIAL_ENDED;
        emit TrialEnded(cardId, tokensReturned);
        emit PhaseAdvanced(cardId, oldPhase, Phase.TRIAL_ENDED);
    }

    function checkLiquidityBacking(uint256 cardId, uint256 threshold) external cardExists(cardId) {
        Card storage card = cards[cardId];
        require(card.phase == Phase.TRIAL_ENDED, "Card not in TRIAL_ENDED phase");

        bool isBacked = liquidityPool.hasSufficientLiquidity(card.owner, threshold);
        card.liquidityBacked = isBacked;
        Phase oldPhase = card.phase;
        card.phase = Phase.BACKING_CHECK;
        emit BackingChecked(cardId, isBacked);
        emit PhaseAdvanced(cardId, oldPhase, Phase.BACKING_CHECK);
    }

    function sellWithSeverance(uint256 cardId) external cardExists(cardId) onlyCardOwner(cardId) nonReentrant {
        Card storage card = cards[cardId];
        require(card.phase == Phase.BACKING_CHECK, "Card not in BACKING_CHECK phase");
        require(!card.liquidityBacked, "Liquidity is backed, cannot sell with severance");

        uint256 severanceAmount = (card.originalPayment * SEVERANCE_PERCENT) / 100;
        card.severancePaid = severanceAmount;

        fireCoin.burnFrom(card.owner, card.fireCoinEarned, cardId);
        liquidityPool.removeLiquidity(card.owner, card.fireCoinEarned);

        Phase oldPhase = card.phase;
        card.phase = Phase.SELL_SEVERANCE;

        (bool sent, ) = card.owner.call{value: severanceAmount}("");
        require(sent, "Severance payment failed");

        emit SeverancePaid(cardId, severanceAmount);
        emit PhaseAdvanced(cardId, oldPhase, Phase.SELL_SEVERANCE);
    }

    function claimRefund(uint256 cardId) external cardExists(cardId) onlyCardOwner(cardId) nonReentrant {
        Card storage card = cards[cardId];
        require(card.phase == Phase.SELL_SEVERANCE || card.phase == Phase.BACKING_CHECK, "Cannot claim refund in current phase");

        uint256 refundAmount = card.originalPayment;
        Phase oldPhase = card.phase;
        card.phase = Phase.REFUNDED;

        (bool sent, ) = card.owner.call{value: refundAmount}("");
        require(sent, "Refund payment failed");

        emit RefundClaimed(cardId, refundAmount);
        emit PhaseAdvanced(cardId, oldPhase, Phase.REFUNDED);
    }

    function getCard(uint256 cardId) external view cardExists(cardId) returns (Card memory) {
        return cards[cardId];
    }

    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }

    receive() external payable {}
}
