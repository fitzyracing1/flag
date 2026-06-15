import express from "express";
import { v4 as uuidv4 } from "uuid";
import phaseManager from "../services/phaseManager.js";
import { validateIssueCard, validateSpend, validatePayment } from "../middleware/validate.js";

const router = express.Router();

// POST /api/cards/issue
router.post("/issue", validateIssueCard, (req, res) => {
  try {
    const { owner, balance } = req.body;
    const cardId = uuidv4();
    const card = phaseManager.issueCard(cardId, owner, parseFloat(balance));
    res.status(201).json({ success: true, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/cards/:cardId
router.get("/:cardId", (req, res) => {
  try {
    const card = phaseManager.getCard(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json({ success: true, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/cards/:cardId/spend
router.post("/:cardId/spend", validateSpend, (req, res) => {
  try {
    const { amount } = req.body;
    const card = phaseManager.recordSpend(req.params.cardId, parseFloat(amount));
    res.json({ success: true, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/cards/:cardId/pay
router.post("/:cardId/pay", validatePayment, (req, res) => {
  try {
    const { amount } = req.body;
    const card = phaseManager.processPayment(req.params.cardId, parseFloat(amount));
    res.json({ success: true, card, message: `Payment processed. ${card.fireCoinEarned} FIRE tokens minted.` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/cards/:cardId/phase
router.get("/:cardId/phase", (req, res) => {
  try {
    const card = phaseManager.getCard(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });
    const phaseInfo = phaseManager.getPhaseInfo(card.phase);
    res.json({ success: true, cardId: card.cardId, phase: card.phase, phaseInfo });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
