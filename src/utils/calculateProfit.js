// utils/calculateProfit.js

function calculateProfitFromPrices({ priceLow, priceHigh, amountToken = 1, swapFee = parseFloat("0.003"), gasCostUSD = parseFloat("1.0"), safetyMarginPercent = 0.5 }) {
    // priceLow and priceHigh are USD per token (e.g. USDC per WETH)
    if (priceLow == null || priceHigh == null) return { profitable: false, profitUSD: null };

    // USD spent to buy `amountToken` on lower-price DEX
    const usdToBuy = priceLow * amountToken;

    // Fees: each swap takes swapFee fraction of traded amount.
    // Buying cost in USD includes swap fee on input amount (usdToBuy * swapFee)
    // Selling receives priceHigh * amountToken * (1 - swapFee)
    const totalSwapFeesUSD = (usdToBuy * swapFee) + (priceHigh * amountToken * swapFee);

    // USD you get from selling (after swap fee)
    const usdFromSell = priceHigh * amountToken * (1 - swapFee);

    // Profit before gas and safety margin
    const rawProfitUSD = usdFromSell - (usdToBuy + (usdToBuy * swapFee));

    // Another simpler calculation (equivalent):
    // rawProfitUSD = (priceHigh*(1 - swapFee) - priceLow*(1 + swapFee)) * amountToken

    // Apply safety margin (reduce expected profit)
    const safetyMargin = (safetyMarginPercent / 100) * Math.abs(rawProfitUSD);
    const profitAfterSafety = rawProfitUSD - safetyMargin;

    // Subtract gas cost
    const profitUSD = profitAfterSafety - gasCostUSD;

    const profitable = profitUSD > 0;

    // percent relative to capital used (usdToBuy + fees)
    const capitalUsedUSD = usdToBuy + (usdToBuy * swapFee);
    const profitPercent = capitalUsedUSD > 0 ? (profitUSD / capitalUsedUSD) * 100 : 0;

    return {
        profitable,
        profitUSD,
        profitPercent,
        details: {
            usdToBuy,
            usdFromSell,
            totalSwapFeesUSD,
            safetyMargin,
            gasCostUSD,
            rawProfitUSD
        }
    };
}

module.exports = { calculateProfitFromPrices };
