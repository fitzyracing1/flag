import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cardsRouter from "./routes/cards.js";
import tokenRouter from "./routes/token.js";
import lifecycleRouter from "./routes/lifecycle.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/cards", cardsRouter);
app.use("/api/token", tokenRouter);
app.use("/api/lifecycle", lifecycleRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Prepaid Card API server running on port ${PORT}`);
});

export default app;
