const PHASES = {
  SHIP_FIRST: "SHIP_FIRST",
  PAY_SECOND: "PAY_SECOND",
  COIN_ISSUED: "COIN_ISSUED",
  LISTING_ACTIVE: "LISTING_ACTIVE",
  TRIAL_ENDED: "TRIAL_ENDED",
  BACKING_CHECK: "BACKING_CHECK",
  SELL_SEVERANCE: "SELL_SEVERANCE",
  REFUNDED: "REFUNDED",
};

const PHASE_INFO = {
  SHIP_FIRST: {
    index: 0,
    name: "Ship First",
    description: "Card issued. Use it now, pay later.",
    emoji: "✅",
    nextAction: "Record a spend to use your card",
  },
  PAY_SECOND: {
    index: 1,
    name: "Pay Second",
    description: "You've used the card. Pay your balance to earn FireCoin.",
    emoji: "⏳",
    nextAction: "Process payment to receive FIRE tokens",
  },
  COIN_ISSUED: {
    index: 2,
    name: "Coin Issued",
    description: "FireCoin tokens minted and added to your wallet.",
    emoji: "🔥",
    nextAction: "Activate CoinGecko listing to start trial",
  },
  LISTING_ACTIVE: {
    index: 3,
    name: "Listing Active",
    description: "FireCoin listed on CoinGecko. 30-day trial underway.",
    emoji: "💰",
    nextAction: "Wait for trial to complete or end it manually",
  },
  TRIAL_ENDED: {
    index: 4,
    name: "Trial Ended",
    description: "Trial complete. Coin returned to user.",
    emoji: "📈",
    nextAction: "Check if token has sufficient liquidity backing",
  },
  BACKING_CHECK: {
    index: 5,
    name: "Backing Check",
    description: "Liquidity backing analysis complete.",
    emoji: "🔄",
    nextAction: "Sell with severance if not backed, or hold if backed",
  },
  SELL_SEVERANCE: {
    index: 6,
    name: "Sell + Severance",
    description: "Token sold. 10% severance payment sent.",
    emoji: "💸",
    nextAction: "Claim full refund if no buyers found",
  },
  REFUNDED: {
    index: 7,
    name: "Refunded",
    description: "Full refund of original payment issued.",
    emoji: "💵",
    nextAction: "Process complete",
  },
};

const VALID_TRANSITIONS = {
  SHIP_FIRST: ["PAY_SECOND"],
  PAY_SECOND: ["COIN_ISSUED"],
  COIN_ISSUED: ["LISTING_ACTIVE"],
  LISTING_ACTIVE: ["TRIAL_ENDED"],
  TRIAL_ENDED: ["BACKING_CHECK"],
  BACKING_CHECK: ["SELL_SEVERANCE", "REFUNDED"],
  SELL_SEVERANCE: ["REFUNDED"],
  REFUNDED: [],
};

const TOKENS_PER_DOLLAR = 100;
const SEVERANCE_PERCENT = 0.1;
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

class PhaseManager {
  constructor() {
    this.cards = new Map();
  }

  issueCard(cardId, owner, balance) {
    if (this.cards.has(cardId)) {
      throw new Error("Card already exists");
    }
    const card = {
      cardId,
      owner,
      balance,
      spentAmount: 0,
      fireCoinEarned: 0,
      phase: PHASES.SHIP_FIRST,
      trialEndsAt: null,
      liquidityBacked: null,
      severancePaid: 0,
      originalPayment: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.cards.set(cardId, card);
    return card;
  }

  getCard(cardId) {
    return this.cards.get(cardId) || null;
  }

  getAllCards() {
    return Array.from(this.cards.values());
  }

  _validateTransition(card, toPhase) {
    const validNext = VALID_TRANSITIONS[card.phase];
    if (!validNext.includes(toPhase)) {
      throw new Error(`Invalid phase transition from ${card.phase} to ${toPhase}. Valid transitions: ${validNext.join(", ") || "none"}`);
    }
  }

  _advancePhase(card, toPhase) {
    this._validateTransition(card, toPhase);
    const previousPhase = card.phase;
    card.phase = toPhase;
    card.updatedAt = new Date().toISOString();
    console.log(`Card ${card.cardId}: ${previousPhase} -> ${toPhase}`);
    return card;
  }

  recordSpend(cardId, amount) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.SHIP_FIRST) throw new Error(`Cannot record spend in phase ${card.phase}`);
    if (amount <= 0) throw new Error("Spend amount must be positive");
    if (card.spentAmount + amount > card.balance) throw new Error(`Spend would exceed card balance of $${card.balance}`);

    card.spentAmount += amount;
    card.updatedAt = new Date().toISOString();

    if (card.spentAmount > 0) {
      this._advancePhase(card, PHASES.PAY_SECOND);
    }
    return card;
  }

  processPayment(cardId, amount) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.PAY_SECOND) throw new Error(`Cannot process payment in phase ${card.phase}`);
    if (amount < card.spentAmount) throw new Error(`Payment of $${amount} is less than spent amount of $${card.spentAmount}`);

    card.originalPayment = amount;
    card.fireCoinEarned = Math.floor(amount * TOKENS_PER_DOLLAR);
    card.updatedAt = new Date().toISOString();

    this._advancePhase(card, PHASES.COIN_ISSUED);
    return card;
  }

  activateListing(cardId) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.COIN_ISSUED) throw new Error(`Cannot activate listing in phase ${card.phase}`);

    card.trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();
    card.updatedAt = new Date().toISOString();

    this._advancePhase(card, PHASES.LISTING_ACTIVE);
    return card;
  }

  endTrial(cardId) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.LISTING_ACTIVE) throw new Error(`Cannot end trial in phase ${card.phase}`);

    card.updatedAt = new Date().toISOString();
    this._advancePhase(card, PHASES.TRIAL_ENDED);
    return card;
  }

  checkLiquidityBacking(cardId, isBacked) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.TRIAL_ENDED) throw new Error(`Cannot check backing in phase ${card.phase}`);

    card.liquidityBacked = isBacked;
    card.updatedAt = new Date().toISOString();

    this._advancePhase(card, PHASES.BACKING_CHECK);
    return card;
  }

  sellWithSeverance(cardId) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");
    if (card.phase !== PHASES.BACKING_CHECK) throw new Error(`Cannot sell with severance in phase ${card.phase}`);
    if (card.liquidityBacked) throw new Error("Token has sufficient liquidity backing. Severance not applicable.");

    card.severancePaid = this.calculateSeverance(card.originalPayment);
    card.updatedAt = new Date().toISOString();

    this._advancePhase(card, PHASES.SELL_SEVERANCE);
    return card;
  }

  claimRefund(cardId) {
    const card = this.getCard(cardId);
    if (!card) throw new Error("Card not found");

    if (!this.isRefundEligible(card)) {
      throw new Error(`Card in phase ${card.phase} is not eligible for refund`);
    }

    card.updatedAt = new Date().toISOString();
    this._advancePhase(card, PHASES.REFUNDED);
    return card;
  }

  calculateSeverance(originalPayment) {
    return parseFloat((originalPayment * SEVERANCE_PERCENT).toFixed(2));
  }

  isRefundEligible(card) {
    return card.phase === PHASES.SELL_SEVERANCE || card.phase === PHASES.BACKING_CHECK;
  }

  getPhaseInfo(phase) {
    return PHASE_INFO[phase] || null;
  }

  getAllPhaseInfo() {
    return PHASE_INFO;
  }
}

const phaseManager = new PhaseManager();
export default phaseManager;
