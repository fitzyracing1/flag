import React, { useState } from "react";
import { recordSpend, processPayment } from "../services/api.js";

export default function PrepaidCard({ card, onCardUpdate, showNotification }) {
  const [spendAmount, setSpendAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSpend(e) {
    e.preventDefault();
    if (!spendAmount || parseFloat(spendAmount) <= 0) return;
    setLoading(true);
    try {
      const result = await recordSpend(card.cardId, parseFloat(spendAmount));
      onCardUpdate(result.card);
      showNotification(`Spent $${spendAmount} on your card!`);
      setSpendAmount("");
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(e) {
    e.preventDefault();
    const amount = parseFloat(payAmount) || card.spentAmount;
    if (amount <= 0) return;
    setLoading(true);
    try {
      const result = await processPayment(card.cardId, amount);
      onCardUpdate(result.card);
      showNotification(`Payment of $${amount} processed! ${result.card.fireCoinEarned} FIRE tokens earned!`);
      setPayAmount("");
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const remainingBalance = card.balance - card.spentAmount;
  const spentPercent = (card.spentAmount / card.balance) * 100;

  return (
    <div className="prepaid-card-section">
      <h2 className="section-title">My Prepaid Card</h2>

      <div className="credit-card">
        <div className="card-top">
          <div className="card-chip">
            <div className="chip-lines"></div>
          </div>
          <div className="card-logo">🔥 FIRE</div>
        </div>
        <div className="card-number">
          {card.cardId.substring(0, 8).toUpperCase().match(/.{1,4}/g)?.join(" ") || "XXXX XXXX"}
        </div>
        <div className="card-bottom">
          <div className="card-holder">
            <div className="card-label">CARD HOLDER</div>
            <div className="card-value">{card.owner?.split("@")[0]?.toUpperCase() || "USER"}</div>
          </div>
          <div className="card-balance-display">
            <div className="card-label">BALANCE</div>
            <div className="card-value">${card.balance?.toFixed(2)}</div>
          </div>
        </div>
        <div className="card-phase-badge">{card.phase?.replace("_", " ")}</div>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value">${card.balance?.toFixed(2)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Amount Spent</div>
          <div className="stat-value spent">${card.spentAmount?.toFixed(2)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Remaining</div>
          <div className="stat-value available">${remainingBalance?.toFixed(2)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">FIRE Earned</div>
          <div className="stat-value fire">{card.fireCoinEarned || 0} 🔥</div>
        </div>
      </div>

      <div className="balance-bar">
        <div className="balance-bar-fill" style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
      </div>
      <div className="balance-bar-labels">
        <span>Spent: {spentPercent.toFixed(0)}%</span>
        <span>Available: {(100 - spentPercent).toFixed(0)}%</span>
      </div>

      {card.phase === "SHIP_FIRST" && (
        <div className="action-panel">
          <h3>Use Your Card</h3>
          <p>You received your card before paying — use it now!</p>
          <form onSubmit={handleSpend} className="action-form">
            <div className="form-group">
              <label>Spend Amount ($)</label>
              <input
                type="number"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                max={card.balance}
                step="0.01"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !spendAmount}>
              {loading ? "Processing..." : "Use Card"}
            </button>
          </form>
        </div>
      )}

      {card.phase === "PAY_SECOND" && (
        <div className="action-panel pay-panel">
          <h3>Pay Your Balance</h3>
          <p>Pay off your card balance to receive FireCoin tokens!</p>
          <div className="owed-amount">Amount Owed: <strong>${card.spentAmount?.toFixed(2)}</strong></div>
          <form onSubmit={handlePay} className="action-form">
            <div className="form-group">
              <label>Payment Amount ($)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={card.spentAmount?.toFixed(2)}
                min={card.spentAmount}
                step="0.01"
              />
            </div>
            <button type="submit" className="btn-success" disabled={loading}>
              {loading ? "Processing..." : `Pay $${payAmount || card.spentAmount?.toFixed(2)} & Earn FIRE`}
            </button>
          </form>
        </div>
      )}

      {card.phase !== "SHIP_FIRST" && card.phase !== "PAY_SECOND" && (
        <div className="action-panel info-panel">
          <h3>Card Status: {card.phase?.replace(/_/g, " ")}</h3>
          <p>Your card transactions are complete. Check the Phase Tracker for next steps.</p>
          {card.fireCoinEarned > 0 && (
            <div className="fire-earned">
              <span className="fire-icon">🔥</span>
              <span>{card.fireCoinEarned} FIRE tokens earned</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
