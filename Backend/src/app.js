const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS Configuration (IMPORTANT)
const allowedOrigins = [
    "http://localhost:5173",     // local frontend
    "http://13.239.16.202"      // your AWS frontend
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// ✅ Routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// ✅ Health check route (optional but useful)
app.get("/", (req, res) => {
    res.send("API is running...");
});

module.exports = app;