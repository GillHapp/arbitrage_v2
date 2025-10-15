# 🚀 DeFi Arbitrage Trading Bot (Backend Service)

### **Overview**

This backend service simulates a DeFi **arbitrage trading bot** that:

* Fetches real-time token prices from multiple Uniswap V2–compatible DEXs (Uniswap & SushiSwap).
* Detects arbitrage opportunities between them.
* Calculates realistic profit (including fees, gas, and safety margin).
* **Simulates** trade execution (no real blockchain transactions).
* Stores all opportunities in MongoDB.
* Exposes a REST API to fetch recent opportunities.

---

## 🧩 Project Structure

```
├── server.js                      # Entry point
├── config/
│   └── db.js                      # MongoDB connection
├── services/
│   └── arbitrageScanner.js        # Core arbitrage scanning logic
├── routes/
│   └── opportunities.js           # REST API endpoint
├── models/
│   └── Arbitrage.js               # Mongoose schema
├── dex/
│   ├── uniswap.js                 # Uniswap V2 price fetcher
│   └── sushiswap.js               # SushiSwap V2 price fetcher
└── utils/
    └── calculateProfit.js         # Profit simulation logic
```

---

## ⚙️ Setup Instructions

### **1️⃣ Clone & Install**

```bash
git clone https://github.com/GillHapp/arbitrage_v2
cd defi-arbitrage-bot
npm install
```

### **2️⃣ Add Environment Variables**

Create a `.env` file in the root folder:

```bash
INFURA_WSS=wss://mainnet.infura.io/ws/v3/<YOUR_INFURA_PROJECT_ID>
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
```

### **3️⃣ Start Server**

```bash
node server.js
```

Server runs at:

```
http://127.0.0.1:4000
```

---

## 🧠 Logic & Working Explanation

### **1. Price Fetching**

* Uses `ethers.js` to connect to **Uniswap** and **SushiSwap** routers.
* Calls `getAmountsOut()` to compute token output for a fixed input (e.g., 1 WETH → USDC).
* Prices are fetched on every new block using Infura WebSocket provider.

```js
const uniPrice = await uniswap.getPrice(WETH, USDC, amountIn);
const sushiPrice = await sushiswap.getPrice(WETH, USDC, amountIn);
```

---

### **2. Arbitrage Detection**

If one DEX has a lower price for WETH and another has a higher price,
a potential arbitrage opportunity exists.

The scanner compares both prices each block and calculates possible profit.

---

### **3. Profit Simulation (Core Calculation)**

This is done in `utils/calculateProfit.js` via the function:

```js
calculateProfitFromPrices({
  priceLow,
  priceHigh,
  amountToken,
  swapFee,
  gasCostUSD,
  safetyMarginPercent
})
```

#### It simulates the following:

| Step                 | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| 💰 **Buy**           | Buy `amountToken` from the cheaper DEX (priceLow).         |
| 💸 **Sell**          | Sell the same token on the more expensive DEX (priceHigh). |
| 🧾 **Swap Fees**     | Deduct 0.3% (default) on both buy and sell sides.          |
| ⛽ **Gas Cost**       | Deduct fixed USD gas cost (default $1).                    |
| 🧠 **Safety Margin** | Apply 0.5% buffer to account for slippage & volatility.    |
| 📊 **Profit Result** | Return net profit in USD and % ROI.                        |

#### Formula:

```
rawProfit = (priceHigh*(1 - swapFee) - priceLow*(1 + swapFee)) * amount
profitAfterSafety = rawProfit - safetyMargin
netProfit = profitAfterSafety - gasCostUSD
```

#### Example:

If:

* Uniswap price = 2400 USDC/WETH
* SushiSwap price = 2450 USDC/WETH
* amount = 1 WETH
* swapFee = 0.003
* gasCostUSD = 1

Then:

| Step                       | Value                           |
| -------------------------- | ------------------------------- |
| Buy cost                   | 2400                            |
| Sell return                | 2450 × (1 - 0.003) = 2442.65    |
| Fees                       | 7.2 (buy) + 7.35 (sell) = 14.55 |
| Profit before gas          | 35.45                           |
| Profit after safety (0.5%) | ≈ 35.27                         |
| Net profit                 | 35.27 - 1 = **$34.27** ✅        |

So the bot would simulate:

> “Buy 1 WETH on Uniswap and sell on SushiSwap → profit ≈ $34.27”

---

### **4. Simulation vs Real Execution**

This bot **does not send on-chain transactions**.
Instead, it mathematically *simulates* the trade — considering:

* Gas fees
* Swap fees
* Slippage buffer

That’s what the assignment means by:

> “Simulates trade execution (no real on-chain trade).”

So this function acts like a “virtual trade calculator.”

---

### **5. Data Storage**

Every price comparison and profit calculation is stored in MongoDB using the `Arbitrage` model:

```js
{
  tokenPair: "WETH/USDC",
  dexA: "Uniswap",
  dexB: "SushiSwap",
  priceA: 2400,
  priceB: 2450,
  profitPercent: 1.41,
  gasCostUSD: 1.0,
  blockNumber: 19582391,
  timestamp: "2025-10-15T08:31:00Z"
}
```

---

### **6. REST API**

| Endpoint                 | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `GET /api/opportunities` | Returns the 20 most recent arbitrage opportunities |

**Example response:**

```json
[
  {
    "tokenPair": "WETH/USDC",
    "dexA": "Uniswap",
    "dexB": "SushiSwap",
    "priceA": 2400,
    "priceB": 2450,
    "profitPercent": 1.41,
    "gasCostUSD": 1,
    "blockNumber": 19582391,
    "timestamp": "2025-10-15T08:31:00Z"
  }
]
```

---

## 🧩 Significance of Each Component

| File                          | Role        | Significance                                        |
| ----------------------------- | ----------- | --------------------------------------------------- |
| **server.js**                 | Main entry  | Starts API + scanner                                |
| **db.js**                     | DB config   | Connects MongoDB                                    |
| **arbitrageScanner.js**       | Core logic  | Fetches prices, compares DEXs, triggers profit calc |
| **uniswap.js / sushiswap.js** | DEX modules | Gets token prices from router contracts             |
| **calculateProfit.js**        | Simulation  | Realistic profit computation (swap, gas, safety)    |
| **Arbitrage.js**              | Model       | Defines MongoDB schema                              |
| **opportunities.js**          | API route   | Exposes `/api/opportunities` endpoint               |

---


Future logic could:

1. Fetch prices for all three swap legs.
2. Multiply swap ratios.
3. Check if final ETH amount > initial ETH (after fees).
4. Simulate same way using `calculateProfitFromPrices`.

---

## 🧾 Example Logs

```bash
✅ MongoDB connected
🚀 Starting arbitrage scanner...
📦 Block 19582390
🦄 Uniswap price: 2400.12
🍣 SushiSwap price: 2450.44
💹 Profit %: 1.41 | Profitable: true
💾 Stored opportunity in DB
```

---

## 📘 Summary

| Requirement                                | Implemented |
| ------------------------------------------ | ----------- |
| Fetch real-time token prices               | ✅           |
| Identify arbitrage opportunities           | ✅           |
| Calculate potential profit (fees + safety) | ✅           |
| Simulate trade execution                   | ✅           |
| Store results in database                  | ✅           |
| Provide API for recent opportunities       | ✅           |

---



# 🚀 FlashLoan Arbitrage with Hardhat

This project demonstrates a **flash loan arbitrage** strategy using Hardhat’s **mainnet forking** feature.
It simulates borrowing tokens, swapping between them to exploit price differences, and repaying the loan — all in **one atomic transaction**.

---

## 📦 Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/GillHapp/flashLoan.git
cd flashLoan
```

### 2️⃣ Install Dependencies

```bash
npm install --legacy-peer-deps
```

> ⚠ If you get peer dependency errors, use `--legacy-peer-deps` to bypass.

### 3️⃣ Configure Environment Variables

Create a `.env` file:

```env
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

### 4️⃣ Hardhat Config Example

```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.5" },
      { version: "0.6.6" },
      { version: "0.8.8" },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/2de477c3b1b74816ae5475da6d289208",
      },
    },
  },
  mocha: {
    timeout: 120000, // avoid test timeouts when forking
  },
};

```

---

## 🔄 How the Process Works

### 1. Mainnet Fork

* Hardhat forks Ethereum mainnet using your RPC provider.
* All real token contracts, pools, and prices are available locally.

### 2. Impersonating Whale Accounts

* Some accounts (whales) hold large amounts of USDC, LINK, UNI, WETH.
* We impersonate them with:

```js
await network.provider.request({
  method: "hardhat_impersonateAccount",
  params: [whaleAddress],
});
```

* This lets us transfer tokens to our contract during tests.

### 3. Funding the Contract

* `fundContract` in `utils/utilities.js`:

  * Impersonates a whale.
  * Transfers tokens with the correct decimals to our flash loan contract.
  * Stops impersonation afterward.

Example:

```js
await fundContract(usdcContract, USDC_WHALE, flashLoanAddress, "1"); // sends 1 USDC
```

### 4. Arbitrage Execution

* The contract requests a flash loan.
* In the callback:

  * Swaps tokens via a DEX sequence (e.g., USDC → WETH → UNI → USDC).
  * Repays the loan in the same transaction.
* If profitable, leftover tokens remain as profit.

### 5. Verification

* Tests check:

  * Token balances after execution.
  * Whether the contract repaid the loan.
  * Any profit made.

Example output:

```
Balance of USDC: 1
Balance of LINK: 0
Balance of UNI: 0
✔ executes the arbitrage
```

---

## 💰 Tokens Used

| Token         | Symbol | Decimals | Example Whale Address                        |
| ------------- | ------ | -------- | -------------------------------------------- |
| USD Coin      | USDC   | 6        | `0x55fe002aeff02f77364de339a1292923a15844b8` |
| Chainlink     | LINK   | 18       | `0xDC76CD25977E0a5Ae17155770273aD58648900D3` |
| Uniswap       | UNI    | 18       | `0x47ac0Fb4F2D84898e4D9E7b4D61897762D01E9c6` |
| Wrapped Ether | WETH   | 18       | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

**Decimals matter** when funding:

```js
ethers.utils.parseUnits("1", 6)  // USDC
ethers.utils.parseUnits("1", 18) // LINK, UNI, WETH
```

---

## 🧪 Run Tests

```bash
npx hardhat test
```

Example:

```
  FlashLoan Contract
    Arbitrage Execution
      ✔ ensures the contract is funded
Balance of USDC: 1
Balance of LINK: 0
Balance of UNI: 0
      ✔ executes the arbitrage (69282ms)

  2 passing (2m)
```

---

### 6. When Arbitrage Fails

* Flash loans do **not guarantee** profit — they only provide capital.
* If no profitable price difference exists between the chosen DEX paths, the swaps will result in **zero gain** or even a small loss (after fees).
* In the real world, such a transaction would **revert automatically** if not profitable, to avoid losses.
* In this simulation, we allow execution to show the mechanics, but the test results might show unchanged balances.

Example:

```
Balance of USDC: 1
Balance of LINK: 0
Balance of UNI: 0
No profit — arbitrage opportunity not found.
```

---


## ⚠ Notes

* Node.js version 18.x works but may show a Hardhat warning. Downgrade to Node 16.x for full compatibility.
* This is for **educational purposes only**. Do not use on mainnet without understanding the risks.

---
