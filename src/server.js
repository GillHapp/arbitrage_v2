// server.js
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const startScanner = require("./services/arbitrageScanner");
const opportunitiesRoute = require("./routes/opportunities");

const app = express();
app.use(express.json());

// ✅ Define a root route for sanity check
app.get("/", (req, res) => {
    res.send("Server is running 🚀 — visit /api/opportunities");
});

// ✅ Register the route
app.use("/api/opportunities", opportunitiesRoute);

const PORT = 4000;

(async () => {
    await connectDB();
    startScanner();
    app.listen(PORT, () => console.log(`🌐 API running on http://127.0.0.1:${PORT}`));
})();
