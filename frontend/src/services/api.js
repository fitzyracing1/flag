import axios from "axios";

const BASE_URL = "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || "API request failed";
    throw new Error(message);
  }
);

// Card endpoints
export async function issueCard(owner, balance) {
  return api.post("/cards/issue", { owner, balance });
}

export async function getCard(cardId) {
  return api.get(`/cards/${cardId}`);
}

export async function recordSpend(cardId, amount) {
  return api.post(`/cards/${cardId}/spend`, { amount });
}

export async function processPayment(cardId, amount) {
  return api.post(`/cards/${cardId}/pay`, { amount });
}

export async function getCardPhase(cardId) {
  return api.get(`/cards/${cardId}/phase`);
}

// Token endpoints
export async function getTokenPrice(symbol = "ethereum") {
  return api.get("/token/price", { params: { symbol } });
}

export async function getListingStatus(cardId) {
  return api.get(`/token/listing/${cardId}`);
}

export async function activateListing(cardId) {
  return api.post(`/token/activate-listing/${cardId}`);
}

// Lifecycle endpoints
export async function endTrial(cardId) {
  return api.post(`/lifecycle/${cardId}/end-trial`);
}

export async function checkBacking(cardId, threshold = 1000) {
  return api.post(`/lifecycle/${cardId}/check-backing`, { threshold });
}

export async function sellSeverance(cardId) {
  return api.post(`/lifecycle/${cardId}/sell-severance`);
}

export async function claimRefund(cardId) {
  return api.post(`/lifecycle/${cardId}/refund`);
}
