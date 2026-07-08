import express from "express";
import dotenv from "dotenv";
dotenv.config();
import redis from "./redisClient.js";
import checkRoute from "./routes/check.js";


const app = express();
app.use(express.json())

const PORT = process.env.PORT || 8888;
app.use('/', checkRoute);

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
