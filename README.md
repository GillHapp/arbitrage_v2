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
| USD Coin      | USDC   | 6        | `0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8` |
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
