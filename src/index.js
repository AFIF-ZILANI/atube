import app from "./app.js";
import { connectDB } from "./db/dbConfig.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});
const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error;
    });
    app.listen(port, () => {
      console.log(`server is running on port ${port}...`);
    });
  })
  .catch((err) => console.log("Mongo Database connection Failed!", err));