// services/arbitrageScanner.js
require("dotenv").config();
const { ethers } = require("ethers");
const Arbitrage = require("../models/Arbitrage");
const uniswap = require("../dex/uniswap");
const sushiswap = require("../dex/sushiswap");
const { calculateProfitFromPrices } = require("../utils/calculateProfit");

const provider = new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/2de477c3b1b74816ae5475da6d289208");

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function simulateTwoSwapProfit({ lowDex, highDex, tokenIn, tokenOut, amountToken }) {
    // Simulate: buy tokenIn on lowDex with tokenOut then sell tokenIn on highDex to tokenOut.
    // We assume tokenIn is WETH and tokenOut is USDC (for your current use-case)
    // Use routers' getAmountsOut for precise amounts when available (these functions already call getAmountsOut)
    try {
        // lowDex.getPrice returns price in USD/USDC for amountToken tokens
        const priceLow = await lowDex.getPrice(tokenIn, tokenOut, ethers.utils.parseUnits(amountToken.toString(), 18));
        const priceHigh = await highDex.getPrice(tokenIn, tokenOut, ethers.utils.parseUnits(amountToken.toString(), 18));
        // both as numbers (USDC per WETH)
        return { priceLow, priceHigh };
    } catch (err) {
        console.error("simulateTwoSwapProfit error:", err.message);
        return { priceLow: null, priceHigh: null };
    }
}

async function startScanner() {
    console.log("🚀 Starting arbitrage scanner...");

    const amountToken = 1; // 1 WETH
    const swapFee = parseFloat("0.003");
    const gasCostUSD = parseFloat("1.0");
    const safetyMarginPercent = parseFloat("0.5");

    provider.on("block", async (blockNumber) => {
        try {
            console.log(`📦 Block ${blockNumber}`);

            // simulate two-swap
            const { priceLow: uniPrice, priceHigh: sushiPrice } = await simulateTwoSwapProfit({
                lowDex: uniswap, // will treat uni as lowDex and sushi as highDex later
                highDex: sushiswap,
                tokenIn: WETH,
                tokenOut: USDC,
                amountToken
            });

            if (uniPrice == null || sushiPrice == null) {
                console.log("⚠️ One of the prices is null; skipping");
                return;
            }

            // Determine buy-low / sell-high
            let priceLow, priceHigh, dexBuy, dexSell;
            if (uniPrice < sushiPrice) {
                priceLow = uniPrice; priceHigh = sushiPrice; dexBuy = "Uniswap"; dexSell = "SushiSwap";
            } else {
                priceLow = sushiPrice; priceHigh = uniPrice; dexBuy = (sushiPrice < uniPrice) ? "SushiSwap" : "Uniswap"; dexSell = (dexBuy === "Uniswap") ? "SushiSwap" : "Uniswap";
                // above sets dex strings but actual mapping to routers below
                dexBuy = (priceLow === uniPrice) ? "Uniswap" : "SushiSwap";
                dexSell = (priceHigh === sushiPrice) ? "SushiSwap" : "Uniswap";
            }

            const calc = calculateProfitFromPrices({
                priceLow,
                priceHigh,
                amountToken,
                swapFee,
                gasCostUSD,
                safetyMarginPercent
            });

            console.log(`🧾 Buy on ${dexBuy} @ ${priceLow} | Sell on ${dexSell} @ ${priceHigh}`);
            console.log(`💹 Profit USD: ${calc.profitUSD?.toFixed(4)} | Profit%: ${calc.profitPercent.toFixed(4)} | Profitable: ${calc.profitable}`);

            // Save every scan
            await Arbitrage.create({
                tokenPair: "WETH/USDC",
                dexA: dexBuy,
                dexB: dexSell,
                priceA: priceLow,
                priceB: priceHigh,
                profitPercent: calc.profitPercent,
                profitUSD: calc.profitUSD,
                gasCostUSD,
                blockNumber,
            });

        } catch (err) {
            console.error("⚠️ Error scanning:", err.stack || err.message);
        }
    });
}

module.exports = startScanner;
