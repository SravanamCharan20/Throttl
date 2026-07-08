import express from "express";
import dotenv from "dotenv";
dotenv.config();
import redis from "./redisClient.js";

const app = express();

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
