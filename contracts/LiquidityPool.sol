// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityPool is Ownable, ReentrancyGuard {
    mapping(address => uint256) public poolBalances;
    mapping(address => uint256) public tokensSold;

    uint256 public constant FEE_PERCENT = 1; // 1% fee
    uint256 public constant ETH_PER_TOKEN = 1e15; // 0.001 ETH per token

    event LiquidityAdded(address indexed user, uint256 amount);
    event LiquidityRemoved(address indexed user, uint256 amount);
    event TokenSold(address indexed user, uint256 tokenAmount, uint256 ethReceived);

    constructor() Ownable(msg.sender) {}

    function addLiquidity(address user, uint256 amount) external onlyOwner {
        poolBalances[user] += amount;
        emit LiquidityAdded(user, amount);
    }

    function removeLiquidity(address user, uint256 amount) external onlyOwner nonReentrant {
        require(poolBalances[user] >= amount, "Insufficient pool balance");
        poolBalances[user] -= amount;
        emit LiquidityRemoved(user, amount);
    }

    function sellToken(address user, uint256 tokenAmount) external onlyOwner nonReentrant returns (uint256 ethAmount) {
        uint256 grossEth = tokenAmount * ETH_PER_TOKEN;
        uint256 fee = (grossEth * FEE_PERCENT) / 100;
        ethAmount = grossEth - fee;
        tokensSold[user] += tokenAmount;
        emit TokenSold(user, tokenAmount, ethAmount);
        return ethAmount;
    }

    function getPoolBalance(address user) external view returns (uint256) {
        return poolBalances[user];
    }

    function hasSufficientLiquidity(address user, uint256 threshold) external view returns (bool) {
        return poolBalances[user] >= threshold;
    }

    receive() external payable {}
}
