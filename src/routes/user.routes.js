import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";


export const router = Router();

router.route("/register").post(registerUser)
// router.route("/login").post(loginUser)