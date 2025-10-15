const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/2de477c3b1b74816ae5475da6d289208");
const routerAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

async function getPrice(tokenIn, tokenOut, amountIn) {
    const abi = [
        "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
    ];
    const router = new ethers.Contract(routerAddress, abi, provider);

    try {
        const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
        if (!amounts || amounts.length < 2) throw new Error("Invalid output from getAmountsOut");

        const price = parseFloat(ethers.utils.formatUnits(amounts[1], 6)); // USDC (6 decimals)
        console.log(`🍣 SushiSwap price: ${price}`);
        return price;
    } catch (err) {
        console.error("❌ Error fetching SushiSwap price:", err.message);
        return null;
    }
}

module.exports = { getPrice };
