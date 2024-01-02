import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloud.js";
import { emailValidator } from "../utils/emailValidator.js";
import { ApiResponse } from "../utils/apiResponse.js";

const genAccAndRefTok = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.genrateAccessToken();
    const refreshToken = await user.genrateRefreshToken();

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access token!"
    );
  }
};

export const registerUser = asyncHandler(async (request, response) => {
  const { fullName, username, email, password } = request.body;
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  if (!emailValidator(email)) {
    throw new ApiError(400, "Email must be right format!");
  }

  if (!(password.length > 10)) {
    throw new ApiError(400, "Password length must be greater than 10 char");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or password already exists!");
  }

  // console.log(request.files)
  const avatarLocalPath = request.files[0]?.path;
  // const coverImageLocalPath = request.files[1].path;

  let coverImageLocalPath;
  if (
    request.files &&
    Array.isArray(request.files) &&
    request.files.length > 1
  ) {
    coverImageLocalPath = request.files[1].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar must be required!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log(coverImage);
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
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

export const loginUser = asyncHandler(async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password || email === "" || password === "") {
    throw new ApiError(400, "Email and password must required!");
  }

  if (!emailValidator(email)) {
    throw new ApiError(400, "Email must be right format!");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User dose not existed!");
  }

  const passwordValid = await user.isPasswordCorrect(password);

  if (!passwordValid) {
    throw new ApiError(400, "password invalid!");
  }

  const { accessToken, refreshToken } = await genAccAndRefTok(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    // secure: true,
  };

  return response.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!"
      )
    );
});

export const logoutUser = asyncHandler(async (request, response) => {
  await User.findByIdAndUpdate(
    request.auth._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully!"));
});
