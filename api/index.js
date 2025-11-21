import express from "express";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import authRoutes from "./routes/auth.js";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";

const app = express();

// Allow client at 3001. Adjust as needed or use an env var.
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
}));

app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Psychic Chat API' });
});

// Public auth routes (no authentication required)
app.use("/auth", authRoutes);

// Protected routes (authentication required)
app.use("/chat", authenticateToken, chatRoutes);
app.use("/user-profile", authenticateToken, userProfileRoutes);
app.use("/user-astrology", authenticateToken, astrologyRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
});
