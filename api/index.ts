import express from "express";
import chatRoutes from "./routes/chat.ts";
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

app.use("/chat", chatRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
});
