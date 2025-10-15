// routes/opportunities.js
const express = require("express");
const router = express.Router();
const Arbitrage = require("../models/Arbitrage");

router.get("/", async (req, res) => {
    try {
        const results = await Arbitrage.find().sort({ timestamp: -1 }).limit(20);
        res.json(results);
    } catch (err) {
        console.error("Error fetching opportunities:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
