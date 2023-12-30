import { Router } from "express";
import { registerUser, loginUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

export const router = Router();

router.route("/register").post(
  upload.array("images", 2),
  registerUser
);
// router.route("/login").post(loginUser);
