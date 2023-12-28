import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloud.js";
import { emailValidator } from "../utils/emailValidator.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const registerUser = asyncHandler(async (request, response) => {
  const { fullName, username, email, password } = request.body;
  if (
    [fullName, username, email, password, avatar].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  if (!emailValidator(email)) {
    throw new ApiError(400, "Email must be right format!");
  }

  if (!(password.length > 10)) {
    throw new ApiError(400, "Password length must be greater than 10 char");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or password already exists!");
  }

  const avatarLocalPath = request.files?.avatar[0]?.path;
  const coverImageLocalPath = request.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar must be required!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  const user = await User.create({
    fullName,
    username,
    password,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong on creating the user!");
  }

  return response
    .status(2001)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

export const loginUser = asyncHandler(async (request, response) => {
  const { email, password } = request.body;

  if ([email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }

  if (!emailValidator(email)) {
    throw new ApiError(400, "Email must be right format!");
  }

  const existedUser = User.findOne({ email });

});
