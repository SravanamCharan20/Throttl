import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import redis from "./redisClient.js";
import checkRoute from "./routes/check.js";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8888;
app.use("/", checkRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
