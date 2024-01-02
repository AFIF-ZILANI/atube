import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (request, _, next) => {
  try { 
    const accessToken =
      request.cookies?.accessToken ||
      request.header("Authorization")?.replace("Bearer ", "") || request.body?.accessToken;

    if (!accessToken) {
      throw new ApiError(401, "Unauthoried request!");
    }

    const decodedData = Jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    if (!decodedData) {
      throw new ApiError(
        500,
        "Something went wrong on decoding the Access Token!"
      );
    }

    const user = await User.findById(decodedData._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token!");
    }

    request.auth = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Access Token is not valid!");
  }
});
