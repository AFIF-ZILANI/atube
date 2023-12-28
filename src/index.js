import app from "./app.js";
import { connectDB } from "./db/dbConfig.js";
import dotenv from "dotenv";
import { emailValidator } from "./utils/emailValidator.js";

dotenv.config({
  path: "./env",
});
const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`server is running on port ${port}...`);
    });
  })
  .catch((err) => console.log("Mongo Database connection Failed!", err));