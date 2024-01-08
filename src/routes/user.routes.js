import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  changeCurrentFullName,
  changeCurrentEmail,
  changeCurrentUserName,
  changeCurrentAvatar,
  changeCurrentCoverImage,
  getUserProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleeare.js";

export const router = Router();

router.route("/auth/register").post(upload.array("images", 2), registerUser);

router.route("/auth/login").post(loginUser);

// secured routes
router.route("/auth/logout").post(verifyJWT, logoutUser);
router.route("/auth/get-access-token").post(refreshAccessToken)
router.route("/user/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/user/profile").get(verifyJWT, getCurrentUser)
router.route("/user/change-fullname").patch(verifyJWT, changeCurrentFullName)
router.route("/user/change-email").patch(verifyJWT, changeCurrentEmail)
router.route("/user/change-username").patch(verifyJWT, changeCurrentUserName)
router.route("/user/change-avatar").patch(verifyJWT, upload.single("avatar"), changeCurrentAvatar)
router.route("/user/change-cover-image").patch(verifyJWT, upload.single("coverImage"), changeCurrentCoverImage)
router.route("/channel/:username").get(verifyJWT, getUserProfile)
router.route("/user/history").get(verifyJWT, getWatchHistory)
