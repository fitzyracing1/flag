# FireCoin Prepaid Card System

A 7-phase prepaid debit card product with an integrated crypto token (FireCoin) lifecycle. Built as a monorepo with Solidity smart contracts, a Node.js/Express backend API, and a React frontend dashboard.

---

## Phase Flow

```
Phase 1        Phase 2        Phase 3          Phase 4         Phase 5           Phase 6            Phase 7
SHIP_FIRST ──► PAY_SECOND ──► COIN_ISSUED ──► LISTING_ACTIVE ──► TRIAL_ENDED ──► BACKING_CHECK ──► SELL_SEVERANCE ──► REFUNDED
   ✅              ⏳              🔥               💰               📈               🔄                  💸                💵
 Get card      Pay balance    FIRE minted      30-day trial     Trial over       Liquidity OK?      Sell + 10%         Full
  use now       earn FIRE     CoinGecko          starts         coin back        If not, sell       severance         refund
                              listing                                                                                 payout
```

### Phase Descriptions

| # | Phase | Description |
|---|-------|-------------|
| 1 | **SHIP_FIRST** | User gets a prepaid debit card and can use it immediately (BNPL) |
| 2 | **PAY_SECOND** | User pays their balance; upon payment they receive FireCoin tokens |
| 3 | **COIN_ISSUED** | FireCoin tokens minted, ready for CoinGecko listing activation |
| 4 | **LISTING_ACTIVE** | FireCoin tracked on CoinGecko Terminal with a per-user liquidity pool; 30-day trial begins |
| 5 | **TRIAL_ENDED** | After trial ends and liquidity sells out, user gets their coin back |
| 6 | **BACKING_CHECK** | System checks if the token can be backed by sufficient liquidity |
| 7a | **SELL_SEVERANCE** | If not backed, user sells token and receives 10% severance of original payment |
| 7b | **REFUNDED** | If no buyers, user gets 100% original payment refunded |

---

## Architecture

```
/
├── contracts/          Solidity smart contracts
│   ├── FireCoin.sol            ERC-20 token (FIRE)
│   ├── LiquidityPool.sol       Per-user liquidity pool
│   ├── PrepaidCardManager.sol  Core lifecycle state machine
│   └── deploy.js               Deployment script (ethers.js)
│
├── backend/            Node.js + Express API (port 3001)
│   └── src/
│       ├── index.js            Server entry point
│       ├── routes/
│       │   ├── cards.js        Card CRUD + phase transitions
│       │   ├── token.js        FireCoin + CoinGecko endpoints
│       │   └── lifecycle.js    Trial/backing/severance/refund
│       ├── services/
│       │   ├── phaseManager.js In-memory state machine
│       │   ├── coingecko.js    CoinGecko API integration
│       │   └── pool.js         Liquidity pool simulation
│       └── middleware/
│           └── validate.js     Request validation
│
├── frontend/           React + Vite dashboard (port 3000)
│   └── src/
│       ├── App.jsx             Main app + tab navigation
│       ├── App.css             Dark theme styles
│       ├── components/
│       │   ├── PhaseTracker.jsx   7-step progress visualization
│       │   ├── PrepaidCard.jsx    Visual card + spend/pay actions
│       │   ├── TokenDashboard.jsx FireCoin balance + CoinGecko
│       │   └── LiquidityPanel.jsx Pool depth + backing actions
│       └── services/
│           └── api.js          All backend API calls
│
├── .env.example        Environment variable template
└── package.json        Root workspace scripts
```

---

## Setup

### Prerequisites
- Node.js >= 18
- npm >= 8

### Install

```bash
# Install all dependencies (backend + frontend)
npm run install:all
```

### Run (Development)

```bash
# Start both backend (port 3001) and frontend (port 3000)
npm run dev
```

Or start individually:

```bash
# Backend only
npm run dev --prefix backend

# Frontend only
npm run dev --prefix frontend
```

### Environment Variables

Copy `.env.example` to `backend/.env`:

```bash
cp .env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `COINGECKO_API_URL` | `https://api.coingecko.com/api/v3` | CoinGecko API base URL |
| `CONTRACT_ADDRESS` | `0x000...000` | Deployed PrepaidCardManager address |
| `CHAIN_ID` | `1` | Ethereum chain ID |
| `SEVERANCE_PERCENT` | `10` | Severance percentage (default 10%) |
| `TRIAL_DAYS` | `30` | Trial period in days |
| `MIN_LIQUIDITY_THRESHOLD` | `1000` | Min FIRE tokens for liquidity backing |

---

## API Reference

### Cards

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cards/issue` | Issue a new prepaid card |
| `GET` | `/api/cards/:cardId` | Get card details + current phase |
| `POST` | `/api/cards/:cardId/spend` | Record a spend on the card |
| `POST` | `/api/cards/:cardId/pay` | Process payment, mint FireCoin |
| `GET` | `/api/cards/:cardId/phase` | Get current phase + next action |

**Issue card** `POST /api/cards/issue`
```json
{ "owner": "user@example.com", "balance": 500 }
```

**Record spend** `POST /api/cards/:cardId/spend`
```json
{ "amount": 150 }
```

**Process payment** `POST /api/cards/:cardId/pay`
```json
{ "amount": 150 }
```

---

### Token

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/token/price` | Get FireCoin price from CoinGecko |
| `GET` | `/api/token/listing/:cardId` | Get listing status for user's pool |
| `POST` | `/api/token/activate-listing/:cardId` | Activate CoinGecko listing phase |

**Price query params:** `?symbol=fire` or `?symbol=ethereum`

---

### Lifecycle

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/lifecycle/:cardId/end-trial` | End trial period |
| `POST` | `/api/lifecycle/:cardId/check-backing` | Check liquidity backing |
| `POST` | `/api/lifecycle/:cardId/sell-severance` | Sell token + receive severance |
| `POST` | `/api/lifecycle/:cardId/refund` | Claim full refund |

**Check backing** `POST /api/lifecycle/:cardId/check-backing`
```json
{ "threshold": 1000 }
```

---

## Smart Contracts

### FireCoin.sol (ERC-20)
- Name: "FireCoin", Symbol: "FIRE"
- Roles: `MINTER_ROLE`, `BURNER_ROLE`
- `mint(address to, uint256 amount, uint256 cardId)` — only MINTER_ROLE
- `burnFrom(address from, uint256 amount, uint256 cardId)` — only BURNER_ROLE

### LiquidityPool.sol
- `addLiquidity(address user, uint256 amount)`
- `removeLiquidity(address user, uint256 amount)`
- `sellToken(address user, uint256 tokenAmount) → uint256 ethAmount`
- `getPoolBalance(address user) → uint256`
- `hasSufficientLiquidity(address user, uint256 threshold) → bool`

### PrepaidCardManager.sol
- `issueCard(address to, uint256 balance) → cardId`
- `recordSpend(uint256 cardId, uint256 amount)`
- `processPayment(uint256 cardId) payable → mints FireCoin`
- `activateListing(uint256 cardId) → starts 30-day trial`
- `endTrial(uint256 cardId)`
- `checkLiquidityBacking(uint256 cardId, uint256 threshold)`
- `sellWithSeverance(uint256 cardId) → burns token, pays 10% severance`
- `claimRefund(uint256 cardId) → refunds 100% original payment`

### Deploy

```bash
cd contracts
RPC_URL=http://localhost:8545 PRIVATE_KEY=0x... node deploy.js
```

---

## Token Economics

- **Earn rate**: 100 FIRE tokens per $1 paid
- **Token price**: $0.0125 per FIRE (mock/demo)
- **Severance**: 10% of original payment amount
- **Refund**: 100% of original payment amount
- **Trial period**: 30 days
- **Min liquidity threshold**: 1,000 FIRE tokens

---

## Notes

- All backend phase logic works **without a real blockchain** — state is in-memory
- CoinGecko integration gracefully falls back to mock data if rate-limited
- The phase state machine enforces valid transitions (phases cannot be skipped)
- Frontend proxies `/api` requests to the backend (configured in `vite.config.js`)
