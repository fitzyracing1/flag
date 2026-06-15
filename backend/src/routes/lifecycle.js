import express from "express";
import phaseManager from "../services/phaseManager.js";
import poolService from "../services/pool.js";

const router = express.Router();

// POST /api/lifecycle/:cardId/end-trial
router.post("/:cardId/end-trial", (req, res) => {
  try {
    const card = phaseManager.endTrial(req.params.cardId);
    res.json({ success: true, card, message: "Trial ended. Coins returned to user." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/lifecycle/:cardId/check-backing
router.post("/:cardId/check-backing", (req, res) => {
  try {
    const { threshold = 1000 } = req.body;
    const isBacked = poolService.checkBacking(req.params.cardId, parseFloat(threshold));
    const card = phaseManager.checkLiquidityBacking(req.params.cardId, isBacked);
    res.json({
      success: true,
      card,
      isBacked,
      message: isBacked ? "Token is backed by sufficient liquidity." : "Token is NOT backed. Consider selling with severance or claiming refund.",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/lifecycle/:cardId/sell-severance
router.post("/:cardId/sell-severance", (req, res) => {
  try {
    const card = phaseManager.sellWithSeverance(req.params.cardId);
    const severanceInfo = poolService.sellTokens(req.params.cardId, card.fireCoinEarned);
    res.json({
      success: true,
      card,
      severance: card.severancePaid,
      sellInfo: severanceInfo,
      message: `Tokens sold. Severance of $${card.severancePaid.toFixed(2)} paid.`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/lifecycle/:cardId/refund
router.post("/:cardId/refund", (req, res) => {
  try {
    const card = phaseManager.claimRefund(req.params.cardId);
    res.json({
      success: true,
      card,
      refundAmount: card.originalPayment,
      message: `Full refund of $${card.originalPayment.toFixed(2)} processed.`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
