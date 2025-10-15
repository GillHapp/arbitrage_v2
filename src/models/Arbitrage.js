// models/Arbitrage.js
const mongoose = require("mongoose");

const arbitrageSchema = new mongoose.Schema({
    tokenPair: String,
    dexA: String,
    dexB: String,
    priceA: Number,
    priceB: Number,
    profitPercent: Number,
    profitUSD: Number,
    gasCostUSD: Number,
    blockNumber: Number,
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Arbitrage", arbitrageSchema);
