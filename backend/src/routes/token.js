import express from "express";
import { getTokenPrice, getMarketData, formatListingData } from "../services/coingecko.js";
import phaseManager from "../services/phaseManager.js";
import poolService from "../services/pool.js";

const router = express.Router();

// GET /api/token/price
router.get("/price", async (req, res) => {
  try {
    const { symbol = "ethereum" } = req.query;
    const priceData = await getTokenPrice(symbol);
    res.json({ success: true, data: priceData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/token/listing/:cardId
router.get("/listing/:cardId", async (req, res) => {
  try {
    const card = phaseManager.getCard(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const poolStats = poolService.getPoolStats(req.params.cardId);
    const listingData = formatListingData(card, poolStats);

    let marketData = null;
    if (card.phase === "LISTING_ACTIVE" || card.phase === "TRIAL_ENDED") {
      marketData = await getMarketData("ethereum");
    }

    res.json({ success: true, listing: listingData, marketData, poolStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/token/activate-listing/:cardId
router.post("/activate-listing/:cardId", (req, res) => {
  try {
    const card = phaseManager.activateListing(req.params.cardId);
    const pool = poolService.createPool(req.params.cardId, card.fireCoinEarned);
    res.json({ success: true, card, pool, message: "CoinGecko listing activated. 30-day trial started." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
