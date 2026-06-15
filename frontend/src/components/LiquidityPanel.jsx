import React, { useState, useEffect } from "react";
import { getListingStatus, checkBacking, sellSeverance, claimRefund } from "../services/api.js";

export default function LiquidityPanel({ card, onCardUpdate, showNotification }) {
  const [poolData, setPoolData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card.cardId) fetchPoolData();
  }, [card.cardId, card.phase]);

  async function fetchPoolData() {
    try {
      const data = await getListingStatus(card.cardId);
      setPoolData(data.poolStats);
    } catch (e) {
      console.warn("Pool data fetch failed:", e.message);
    }
  }

  async function handleCheckBacking() {
    setLoading(true);
    try {
      const result = await checkBacking(card.cardId, 1000);
      onCardUpdate(result.card);
      setPoolData((prev) => ({ ...prev, backed: result.isBacked }));
      showNotification(result.message);
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSellSeverance() {
    setLoading(true);
    try {
      const result = await sellSeverance(card.cardId);
      onCardUpdate(result.card);
      showNotification(`Tokens sold! Severance of $${result.severance?.toFixed(2)} received.`);
      fetchPoolData();
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimRefund() {
    setLoading(true);
    try {
      const result = await claimRefund(card.cardId);
      onCardUpdate(result.card);
      showNotification(`Full refund of $${result.refundAmount?.toFixed(2)} issued!`);
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const balance = poolData?.balance || 0;
  const maxBalance = Math.max(balance, card.fireCoinEarned || 1, 1);
  const fillPercent = Math.min((balance / maxBalance) * 100, 100);

  const threshold = 1000;
  const thresholdPercent = Math.min((threshold / maxBalance) * 100, 100);

  return (
    <div className="liquidity-panel">
      <h2 className="section-title">Liquidity Panel</h2>

      <div className="pool-overview">
        <div className="pool-header">
          <span className="pool-title">FireCoin Pool</span>
          <span className={`backing-badge ${card.liquidityBacked === true ? "backed" : card.liquidityBacked === false ? "not-backed" : "unknown"}`}>
            {card.liquidityBacked === true ? "✅ Backed" : card.liquidityBacked === false ? "❌ Not Backed" : "🔄 Unchecked"}
          </span>
        </div>

        <div className="pool-stats">
          <div className="pool-stat">
            <div className="pool-stat-label">Pool Balance</div>
            <div className="pool-stat-value">{balance.toLocaleString()} FIRE</div>
          </div>
          <div className="pool-stat">
            <div className="pool-stat-label">Pool Depth</div>
            <div className="pool-stat-value">{(poolData?.depth || 0).toLocaleString()} FIRE</div>
          </div>
          <div className="pool-stat">
            <div className="pool-stat-label">Min. Threshold</div>
            <div className="pool-stat-value">{threshold.toLocaleString()} FIRE</div>
          </div>
          <div className="pool-stat">
            <div className="pool-stat-label">Tokens Sold</div>
            <div className="pool-stat-value">{(poolData?.tokensSold || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="pool-depth-viz">
          <h3>Pool Depth Visualization</h3>
          <div className="depth-bar-container">
            <div className="depth-bar">
              <div className="depth-fill" style={{ width: `${fillPercent}%` }}></div>
              <div className="depth-threshold" style={{ left: `${thresholdPercent}%` }}>
                <div className="threshold-line"></div>
                <div className="threshold-label">Min</div>
              </div>
            </div>
            <div className="depth-labels">
              <span>0</span>
              <span>{maxBalance.toLocaleString()} FIRE</span>
            </div>
          </div>
          <div className={`depth-status ${fillPercent >= thresholdPercent ? "sufficient" : "insufficient"}`}>
            {fillPercent >= thresholdPercent ? "Sufficient Liquidity" : "Insufficient Liquidity"}
          </div>
        </div>
      </div>

      <div className="liquidity-actions">
        {card.phase === "TRIAL_ENDED" && (
          <div className="action-panel">
            <h3>Check Liquidity Backing</h3>
            <p>Analyze whether your FireCoin pool has sufficient backing.</p>
            <button className="btn-primary" onClick={handleCheckBacking} disabled={loading}>
              {loading ? "Checking..." : "Check Backing"}
            </button>
          </div>
        )}

        {card.phase === "BACKING_CHECK" && !card.liquidityBacked && (
          <div className="action-panel warning-panel">
            <h3>Insufficient Liquidity Detected</h3>
            <p>Your token pool doesn't have sufficient backing. You can sell your tokens and receive a severance payment.</p>
            <div className="severance-info">
              <span>Severance Amount: </span>
              <strong>${(card.originalPayment * 0.1).toFixed(2)} (10% of ${card.originalPayment?.toFixed(2)})</strong>
            </div>
            <button className="btn-warning" onClick={handleSellSeverance} disabled={loading}>
              {loading ? "Processing..." : "Sell Tokens + Receive Severance 💸"}
            </button>
          </div>
        )}

        {card.phase === "BACKING_CHECK" && card.liquidityBacked && (
          <div className="action-panel success-panel">
            <h3>Liquidity Backed!</h3>
            <p>Your FireCoin pool has sufficient liquidity backing. Your tokens are secure.</p>
            <div className="backed-info">
              <span>Pool Balance: {balance.toLocaleString()} FIRE</span>
            </div>
          </div>
        )}

        {(card.phase === "SELL_SEVERANCE" || (card.phase === "BACKING_CHECK" && card.liquidityBacked === false)) && (
          <div className="action-panel refund-panel">
            <h3>Claim Full Refund</h3>
            <p>If no buyers were found for your tokens, you can claim a full refund of your original payment.</p>
            <div className="refund-info">
              <span>Refund Amount: </span>
              <strong>${card.originalPayment?.toFixed(2)}</strong>
            </div>
            <button className="btn-success" onClick={handleClaimRefund} disabled={loading || card.phase === "REFUNDED"}>
              {loading ? "Processing..." : "Claim Full Refund 💵"}
            </button>
          </div>
        )}

        {card.phase === "REFUNDED" && (
          <div className="action-panel completion-panel">
            <div className="completion-icon">💵</div>
            <h3>Refund Complete</h3>
            <p>Your original payment of ${card.originalPayment?.toFixed(2)} has been fully refunded.</p>
          </div>
        )}

        {!["TRIAL_ENDED", "BACKING_CHECK", "SELL_SEVERANCE", "REFUNDED"].includes(card.phase) && (
          <div className="action-panel info-panel">
            <h3>Liquidity Pool Status</h3>
            <p>Complete the earlier phases to access liquidity panel actions.</p>
            <p className="phase-hint">Current phase: <strong>{card.phase?.replace(/_/g, " ")}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}
