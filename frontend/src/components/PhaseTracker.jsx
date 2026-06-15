import React from "react";
import { endTrial, checkBacking, sellSeverance, claimRefund, activateListing } from "../services/api.js";

const PHASES = [
  { id: "SHIP_FIRST", name: "Ship First", emoji: "✅", description: "Card issued. Use it now, pay later." },
  { id: "PAY_SECOND", name: "Pay Second", emoji: "⏳", description: "Pay your balance to earn FireCoin tokens." },
  { id: "COIN_ISSUED", name: "Coin Issued", emoji: "🔥", description: "FireCoin tokens minted to your wallet." },
  { id: "LISTING_ACTIVE", name: "Listing Active", emoji: "💰", description: "FireCoin listed on CoinGecko. 30-day trial." },
  { id: "TRIAL_ENDED", name: "Trial Ended", emoji: "📈", description: "Trial complete. Liquidity check needed." },
  { id: "BACKING_CHECK", name: "Backing Check", emoji: "🔄", description: "Liquidity backing analysis complete." },
  { id: "SELL_SEVERANCE", name: "Sell + Severance", emoji: "💸", description: "Token sold. 10% severance received." },
  { id: "REFUNDED", name: "Full Refund", emoji: "💵", description: "Original payment fully refunded." },
];

export default function PhaseTracker({ card, onCardUpdate, showNotification }) {
  const [loading, setLoading] = React.useState(false);
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === card.phase);

  async function handleAction(action) {
    setLoading(true);
    try {
      let result;
      switch (action) {
        case "activate-listing":
          result = await activateListing(card.cardId);
          onCardUpdate(result.card);
          showNotification("CoinGecko listing activated! 30-day trial started.");
          break;
        case "end-trial":
          result = await endTrial(card.cardId);
          onCardUpdate(result.card);
          showNotification("Trial ended. Your FireCoin has been returned.");
          break;
        case "check-backing":
          result = await checkBacking(card.cardId, 1000);
          onCardUpdate(result.card);
          showNotification(result.message);
          break;
        case "sell-severance":
          result = await sellSeverance(card.cardId);
          onCardUpdate(result.card);
          showNotification(`Sold! Severance of $${result.severance?.toFixed(2)} received.`);
          break;
        case "refund":
          result = await claimRefund(card.cardId);
          onCardUpdate(result.card);
          showNotification(`Full refund of $${result.refundAmount?.toFixed(2)} processed!`);
          break;
        default:
          break;
      }
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function getNextAction() {
    switch (card.phase) {
      case "COIN_ISSUED": return { label: "Activate CoinGecko Listing", action: "activate-listing" };
      case "LISTING_ACTIVE": return { label: "End Trial Period", action: "end-trial" };
      case "TRIAL_ENDED": return { label: "Check Liquidity Backing", action: "check-backing" };
      case "BACKING_CHECK": return card.liquidityBacked
        ? null
        : { label: "Sell + Receive Severance", action: "sell-severance" };
      case "SELL_SEVERANCE": return { label: "Claim Full Refund", action: "refund" };
      default: return null;
    }
  }

  const nextAction = getNextAction();

  return (
    <div className="phase-tracker">
      <h2 className="section-title">Phase Tracker</h2>
      <p className="section-subtitle">Your journey through the 7-phase system</p>

      <div className="phases-timeline">
        {PHASES.map((phase, index) => {
          const isCompleted = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <div key={phase.id} className={`phase-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${isPending ? "pending" : ""}`}>
              <div className="phase-connector">
                {index > 0 && <div className={`connector-line ${isCompleted || isCurrent ? "active" : ""}`} />}
              </div>
              <div className="phase-bubble">
                <span className="phase-emoji">{phase.emoji}</span>
                {isCompleted && <span className="check-mark">✓</span>}
              </div>
              <div className="phase-info">
                <div className="phase-name">{phase.name}</div>
                <div className="phase-desc">{phase.description}</div>
                {isCurrent && (
                  <span className="phase-badge current-badge">CURRENT</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {nextAction && (
        <div className="next-action-card">
          <h3>Next Action</h3>
          <p>Complete this step to advance to the next phase</p>
          <button className="btn-primary" onClick={() => handleAction(nextAction.action)} disabled={loading}>
            {loading ? "Processing..." : nextAction.label}
          </button>
        </div>
      )}

      {card.phase === "REFUNDED" && (
        <div className="completion-card">
          <span className="completion-icon">💵</span>
          <h3>Process Complete!</h3>
          <p>Your full refund of ${card.originalPayment?.toFixed(2)} has been processed.</p>
        </div>
      )}
    </div>
  );
}
