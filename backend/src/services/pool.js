const pools = new Map();

const FEE_PERCENT = 0.01; // 1% fee

class PoolService {
  createPool(cardId, initialLiquidity = 0) {
    const pool = {
      cardId,
      balance: initialLiquidity,
      initialLiquidity,
      depth: initialLiquidity,
      backed: false,
      tokensSold: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pools.set(cardId, pool);
    return pool;
  }

  getPool(cardId) {
    return pools.get(cardId) || null;
  }

  addLiquidity(cardId, amount) {
    let pool = pools.get(cardId);
    if (!pool) {
      pool = this.createPool(cardId, 0);
    }
    pool.balance += amount;
    pool.depth = pool.balance;
    pool.updatedAt = new Date().toISOString();
    return pool;
  }

  removeLiquidity(cardId, amount) {
    const pool = pools.get(cardId);
    if (!pool) throw new Error("Pool not found");
    if (pool.balance < amount) throw new Error("Insufficient pool balance");
    pool.balance -= amount;
    pool.depth = pool.balance;
    pool.updatedAt = new Date().toISOString();
    return pool;
  }

  getPoolStats(cardId) {
    const pool = pools.get(cardId);
    if (!pool) return { balance: 0, depth: 0, backed: false, tokensSold: 0 };
    return {
      cardId: pool.cardId,
      balance: pool.balance,
      depth: pool.depth,
      backed: pool.backed,
      tokensSold: pool.tokensSold,
      initialLiquidity: pool.initialLiquidity,
      utilizationRate: pool.initialLiquidity > 0 ? ((pool.tokensSold / pool.initialLiquidity) * 100).toFixed(2) : "0.00",
    };
  }

  sellTokens(cardId, tokenAmount) {
    let pool = pools.get(cardId);
    if (!pool) pool = this.createPool(cardId, 0);

    const grossAmount = tokenAmount * 0.0125; // $0.0125 per token
    const fee = grossAmount * FEE_PERCENT;
    const net = grossAmount - fee;

    pool.tokensSold += tokenAmount;
    pool.balance = Math.max(0, pool.balance - tokenAmount);
    pool.depth = pool.balance;
    pool.updatedAt = new Date().toISOString();

    return {
      tokenAmount,
      grossAmount: parseFloat(grossAmount.toFixed(4)),
      fee: parseFloat(fee.toFixed(4)),
      net: parseFloat(net.toFixed(4)),
      received: parseFloat(net.toFixed(4)),
    };
  }

  checkBacking(cardId, threshold = 1000) {
    const stats = this.getPoolStats(cardId);
    const backed = stats.balance >= threshold;
    const pool = pools.get(cardId);
    if (pool) {
      pool.backed = backed;
    }
    return backed;
  }

  getAllPools() {
    return Array.from(pools.values());
  }
}

const poolService = new PoolService();
export default poolService;
