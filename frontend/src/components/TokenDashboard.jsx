import React, { useState, useEffect } from "react";
import { getListingStatus, activateListing, getTokenPrice } from "../services/api.js";

export default function TokenDashboard({ card, firePrice, onCardUpdate, showNotification }) {
  const [listingData, setListingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priceHistory] = useState([0.008, 0.009, 0.010, 0.011, 0.012, 0.0125]);

  useEffect(() => {
    if (card.cardId) fetchListing();
  }, [card.cardId, card.phase]);

  async function fetchListing() {
    try {
      const data = await getListingStatus(card.cardId);
      setListingData(data);
    } catch (e) {
      console.warn("Listing fetch failed:", e.message);
    }
  }

  async function handleActivateListing() {
    if (card.phase !== "COIN_ISSUED") {
      showNotification("Can only activate listing when coins are issued.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await activateListing(card.cardId);
      onCardUpdate(result.card);
      showNotification("FireCoin listed on CoinGecko Terminal! 30-day trial started.");
      fetchListing();
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const currentPrice = firePrice?.firecoin?.usd || 0.0125;
  const priceChange = firePrice?.firecoin?.usd_24h_change || 5.67;
  const fireCoinValue = (card.fireCoinEarned || 0) * currentPrice;

  const getListingBadgeClass = () => {
    if (!listingData) return "badge-pending";
    switch (listingData.listing?.listingStatus) {
      case "active": return "badge-active";
      case "trial_ended": return "badge-ended";
      default: return "badge-pending";
    }
  };

  const getListingLabel = () => {
    if (!listingData) return "Not Listed";
    switch (listingData.listing?.listingStatus) {
      case "active": return "Listed — Trial Active";
      case "trial_ended": return "Trial Ended";
      default: return "Pending Listing";
    }
  };

  return (
    <div className="token-dashboard">
      <h2 className="section-title">FireCoin Dashboard</h2>

      <div className="token-hero">
        <div className="token-icon-large">🔥</div>
        <div className="token-info">
          <div className="token-name">FireCoin</div>
          <div className="token-symbol">FIRE</div>
          <div className={`listing-badge ${getListingBadgeClass()}`}>{getListingLabel()}</div>
        </div>
        <div className="token-price-block">
          <div className="price-main">${currentPrice.toFixed(4)}</div>
          <div className={`price-change ${priceChange >= 0 ? "positive" : "negative"}`}>
            {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      <div className="token-stats-grid">
        <div className="token-stat">
          <div className="stat-label">Your FIRE Balance</div>
          <div className="stat-value fire-value">{card.fireCoinEarned || 0}</div>
          <div className="stat-sub">tokens</div>
        </div>
        <div className="token-stat">
          <div className="stat-label">USD Value</div>
          <div className="stat-value">${fireCoinValue.toFixed(2)}</div>
          <div className="stat-sub">at current price</div>
        </div>
        <div className="token-stat">
          <div className="stat-label">Pool Depth</div>
          <div className="stat-value">{listingData?.poolStats?.depth || 0}</div>
          <div className="stat-sub">FIRE tokens</div>
        </div>
        <div className="token-stat">
          <div className="stat-label">24h Volume</div>
          <div className="stat-value">${((listingData?.poolStats?.balance || 0) * 0.1 * currentPrice).toFixed(2)}</div>
          <div className="stat-sub">USD</div>
        </div>
      </div>

      <div className="price-chart">
        <h3>Price History (7d)</h3>
        <div className="chart-bars">
          {priceHistory.map((price, i) => (
            <div key={i} className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{ height: `${(price / Math.max(...priceHistory)) * 100}%` }}
                title={`$${price}`}
              ></div>
              <div className="chart-label">{`D${i + 1}`}</div>
            </div>
          ))}
        </div>
      </div>

      {listingData && card.phase === "LISTING_ACTIVE" && (
        <div className="coingecko-terminal">
          <h3>CoinGecko Terminal</h3>
          <div className="terminal-grid">
            <div className="terminal-item">
              <span className="terminal-label">Pair</span>
              <span className="terminal-value">{listingData.listing?.coingeckoTerminal?.pair}</span>
            </div>
            <div className="terminal-item">
              <span className="terminal-label">Exchange</span>
              <span className="terminal-value">{listingData.listing?.coingeckoTerminal?.exchange}</span>
            </div>
            <div className="terminal-item">
              <span className="terminal-label">Liquidity</span>
              <span className="terminal-value">${((listingData.listing?.coingeckoTerminal?.liquidity || 0) * currentPrice).toFixed(2)}</span>
            </div>
            <div className="terminal-item">
              <span className="terminal-label">FDV</span>
              <span className="terminal-value">${listingData.listing?.coingeckoTerminal?.fdv?.toFixed(2)}</span>
            </div>
          </div>
          {card.trialEndsAt && (
            <div className="trial-info">
              <span>Trial ends: {new Date(card.trialEndsAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {card.phase === "COIN_ISSUED" && (
        <div className="action-panel">
          <h3>List on CoinGecko</h3>
          <p>Activate your FireCoin listing to start the 30-day trial period.</p>
          <button className="btn-fire" onClick={handleActivateListing} disabled={loading}>
            {loading ? "Activating..." : "Activate CoinGecko Listing 🔥"}
          </button>
        </div>
      )}
    </div>
  );
}
