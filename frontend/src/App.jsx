import React, { useState, useEffect } from "react";
import PhaseTracker from "./components/PhaseTracker.jsx";
import PrepaidCard from "./components/PrepaidCard.jsx";
import TokenDashboard from "./components/TokenDashboard.jsx";
import LiquidityPanel from "./components/LiquidityPanel.jsx";
import { issueCard, getCard, getTokenPrice } from "./services/api.js";

function App() {
  const [activeTab, setActiveTab] = useState("card");
  const [currentCard, setCurrentCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [firePrice, setFirePrice] = useState(null);

  useEffect(() => {
    fetchFirePrice();
    const interval = setInterval(fetchFirePrice, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchFirePrice() {
    try {
      const data = await getTokenPrice("fire");
      setFirePrice(data);
    } catch (e) {
      console.warn("Price fetch failed:", e.message);
    }
  }

  function showNotification(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function handleIssueCard() {
    setLoading(true);
    setError(null);
    try {
      const result = await issueCard("user@example.com", 500);
      setCurrentCard(result.card);
      showNotification("Prepaid card issued! You can now use it immediately.");
      setActiveTab("card");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCardUpdate(updatedCard) {
    setCurrentCard(updatedCard);
  }

  const tabs = [
    { id: "card", label: "My Card", emoji: "💳" },
    { id: "phases", label: "Phase Tracker", emoji: "📊" },
    { id: "token", label: "FireCoin", emoji: "🔥" },
    { id: "liquidity", label: "Liquidity", emoji: "💧" },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🔥</span>
            <span className="logo-text">FireCoin</span>
            <span className="logo-subtitle">Prepaid Card System</span>
          </div>
          {firePrice && (
            <div className="price-ticker">
              <span className="ticker-label">FIRE/USD</span>
              <span className="ticker-price">${firePrice?.firecoin?.usd?.toFixed(4) || "0.0125"}</span>
              <span className={`ticker-change ${(firePrice?.firecoin?.usd_24h_change || 0) >= 0 ? "positive" : "negative"}`}>
                {(firePrice?.firecoin?.usd_24h_change || 5.67) >= 0 ? "+" : ""}
                {(firePrice?.firecoin?.usd_24h_change || 5.67).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {!currentCard && (
        <div className="welcome-banner">
          <h2>Welcome to FireCoin Prepaid Cards</h2>
          <p>Get a prepaid debit card, use it now, pay later and earn FireCoin tokens!</p>
          <button className="btn-primary btn-large" onClick={handleIssueCard} disabled={loading}>
            {loading ? "Issuing Card..." : "Get My Card (Ship First!)"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>
      )}

      {currentCard && (
        <>
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-emoji">{tab.emoji}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          <main className="app-main">
            {activeTab === "phases" && (
              <PhaseTracker card={currentCard} onCardUpdate={handleCardUpdate} showNotification={showNotification} />
            )}
            {activeTab === "card" && (
              <PrepaidCard card={currentCard} onCardUpdate={handleCardUpdate} showNotification={showNotification} />
            )}
            {activeTab === "token" && (
              <TokenDashboard card={currentCard} firePrice={firePrice} onCardUpdate={handleCardUpdate} showNotification={showNotification} />
            )}
            {activeTab === "liquidity" && (
              <LiquidityPanel card={currentCard} onCardUpdate={handleCardUpdate} showNotification={showNotification} />
            )}
          </main>
        </>
      )}

      <footer className="app-footer">
        <p>FireCoin Prepaid System &copy; 2024 | Powered by Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
