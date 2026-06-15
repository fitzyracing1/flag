import axios from "axios";

const COINGECKO_API_URL = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";

const MOCK_PRICE_DATA = {
  ethereum: { usd: 2350.42, usd_24h_change: 2.34 },
  bitcoin: { usd: 43210.5, usd_24h_change: -1.2 },
  firecoin: { usd: 0.0125, usd_24h_change: 5.67 },
};

const MOCK_MARKET_DATA = {
  id: "firecoin",
  symbol: "fire",
  name: "FireCoin",
  current_price: 0.0125,
  market_cap: 125000,
  total_volume: 45000,
  price_change_percentage_24h: 5.67,
  circulating_supply: 10000000,
  total_supply: 10000000,
  ath: 0.05,
  atl: 0.001,
  last_updated: new Date().toISOString(),
};

export async function getTokenPrice(symbol = "ethereum") {
  try {
    const coinId = symbol.toLowerCase() === "fire" || symbol.toLowerCase() === "firecoin" ? "ethereum" : symbol.toLowerCase();
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: { ids: coinId, vs_currencies: "usd", include_24hr_change: "true" },
      timeout: 5000,
    });

    if (symbol.toLowerCase() === "fire" || symbol.toLowerCase() === "firecoin") {
      return { firecoin: MOCK_PRICE_DATA.firecoin, reference: response.data };
    }
    return response.data;
  } catch (error) {
    console.warn("CoinGecko API unavailable, using mock data:", error.message);
    const coinKey = symbol.toLowerCase();
    return MOCK_PRICE_DATA[coinKey] ? { [coinKey]: MOCK_PRICE_DATA[coinKey] } : { [coinKey]: MOCK_PRICE_DATA.ethereum };
  }
}

export async function getMarketData(coinId = "ethereum") {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/coins/${coinId}`, {
      params: { localization: false, tickers: false, community_data: false, developer_data: false },
      timeout: 5000,
    });
    return {
      id: response.data.id,
      symbol: response.data.symbol,
      name: response.data.name,
      current_price: response.data.market_data?.current_price?.usd,
      market_cap: response.data.market_data?.market_cap?.usd,
      total_volume: response.data.market_data?.total_volume?.usd,
      price_change_percentage_24h: response.data.market_data?.price_change_percentage_24h,
      last_updated: response.data.last_updated,
    };
  } catch (error) {
    console.warn("CoinGecko market data unavailable, using mock data:", error.message);
    return MOCK_MARKET_DATA;
  }
}

export function formatListingData(card, poolStats = {}) {
  return {
    tokenName: "FireCoin",
    tokenSymbol: "FIRE",
    cardId: card.cardId,
    owner: card.owner,
    phase: card.phase,
    fireCoinBalance: card.fireCoinEarned,
    listingStatus: card.phase === "LISTING_ACTIVE" ? "active" : card.phase === "TRIAL_ENDED" ? "trial_ended" : "pending",
    trialEndsAt: card.trialEndsAt,
    poolDepth: poolStats.depth || 0,
    poolBalance: poolStats.balance || 0,
    backed: poolStats.backed || false,
    coingeckoTerminal: {
      pair: "FIRE/USD",
      exchange: "FireSwap",
      price: 0.0125,
      volume24h: poolStats.balance ? poolStats.balance * 0.1 : 0,
      liquidity: poolStats.balance || 0,
      fdv: (card.fireCoinEarned || 0) * 0.0125,
    },
  };
}
