import { connectDB } from "./db/dbConfig.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});

connectDB();
