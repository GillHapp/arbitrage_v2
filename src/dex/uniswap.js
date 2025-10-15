// dex/uniswap.js
const { ethers } = require("ethers");
require("dotenv").config();
const provider = new ethers.providers.WebSocketProvider(process.env.INFURA_WS);
const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // UniswapV2 router

async function getPrice(tokenIn, tokenOut, amountIn) {
    const abi = ["function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"];
    const router = new ethers.Contract(routerAddress, abi, provider);
    try {
        const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
        if (!amounts || amounts.length < 2) throw new Error("Invalid output from getAmountsOut");
        // tokenOut assumed USDC (6 decimals) — format accordingly
        const price = parseFloat(ethers.utils.formatUnits(amounts[1], 6));
        return price;
    } catch (err) {
        console.error("❌ Error fetching Uniswap price:", err.message);
        return null;
    }
}

module.exports = { getPrice };
