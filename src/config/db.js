const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect("mongodb+srv://gillharpreetsingh211_db_user:p5tBHgjGYV8SlBKI@cluster0.r8rkjfz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }
}

module.exports = connectDB;
