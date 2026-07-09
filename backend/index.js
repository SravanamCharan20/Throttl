import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import redis from "./redisClient.js";
import checkRoute from "./routes/check.js";

const app = express();
app.use(express.json());
const allowedOrigins = [
  "https://throttl-flax.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const PORT = process.env.PORT || 8888;
app.use("/", checkRoute);

app.get("/uptime", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
