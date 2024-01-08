import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloud.js";
import { emailValidator } from "../utils/emailValidator.js";
import { ApiResponse } from "../utils/apiResponse.js";
import Jwt from "jsonwebtoken";
import mongoose from "mongoose";

const ERROR = (code, err) => {
  throw new ApiError(code, err);
};

const options = {
  httpOnly: true,
  secure: false,
};

const genAccAndRefTok = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.genrateAccessToken();
    const refreshToken = await user.genrateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    ERROR(500, "Something went wrong while generating the access token!");
  }
};

export const registerUser = asyncHandler(async (request, response) => {
  const { fullName, username, email, password } = request.body;
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    ERROR(400, "All fields are required!");
  }

  if (!emailValidator(email)) {
    ERROR(400, "Email must be right format!");
  }

  if (!(password.length > 10)) {
    ERROR(400, "Password length must be greater than 10 char");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    ERROR(409, "User with email or password already exists!");
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
    ERROR(400, "Avatar must be required!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log(coverImage);
  if (!avatar) {
    ERROR(400, "Avatar file is required!");
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
    ERROR(500, "Something went wrong on creating the user!");
  }

  return response
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

export const loginUser = asyncHandler(async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password || email === "" || password === "") {
    ERROR(400, "Email and password must required!");
  }

  if (!emailValidator(email)) {
    ERROR(400, "Email must be right format!");
  }

  const user = await User.findOne({ email });

  if (!user) {
    ERROR(404, "User dose not existed!");
  }

  const passwordValid = await user.isPasswordCorrect(password);

  if (!passwordValid) {
    ERROR(400, "password invalid!");
  }

  const { accessToken, refreshToken } = await genAccAndRefTok(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return response
    .status(200)
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

  return response
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully!"));
});

export const refreshAccessToken = asyncHandler(async (request, response) => {
  const incomingRefreshToken =
    request.cookies.refreshToken || request.body.refreshToken;

  if (!incomingRefreshToken) {
    ERROR(401, "Unauthorized request!");
  }

  try {
    const decodedData = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedData) {
      ERROR(500, "Something went wrong on decoding the Access Token!");
    }

    const user = await User.findById(decodedData?._id);

    if (!user) {
      ERROR(401, "Invalid Refresh Token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      ERROR(401, "Refresh token is expired or used!");
    }

    const { accessToken, refreshToken } = await genAccAndRefTok(user._id);

    return response
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token Refreshed!"
        )
      );
  } catch (error) {
    ERROR(401, error?.message || "Invalid refreshToken!");
  }
});

export const changeCurrentPassword = asyncHandler(async (request, response) => {
  const { oldPassword, newPassword } = request.body;
  if (
    oldPassword === "" ||
    newPassword === "" ||
    !oldPassword ||
    !newPassword
  ) {
    ERROR(400, "Old password or new password is missing!");
  }

  const user = await User.findById(request.auth?._id);

  if (!user.isPasswordCorrect(oldPassword)) {
    ERROR(400, "password is not valid!");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return response
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

export const getCurrentUser = asyncHandler((request, response) => {
  const user = request?.auth;

  if (!user) {
    ERROR(400, "can't get user!");
  }

  return response
    .status(200)
    .json(new ApiResponse(200, user, "get user successfully!"));
});

export const changeCurrentFullName = asyncHandler(async (request, response) => {
  const { fullName } = request.body;

  if (!fullName || fullName === "") {
    ERROR(400, "New full Name is required!");
  }

  const user = await User.findByIdAndUpdate(
    request.auth?._id,
    {
      $set: {
        fullName,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(new ApiResponse(200, user, "Full Name updated successfully!"));
});

export const changeCurrentEmail = asyncHandler(async (request, response) => {
  const { email } = request.body;

  if (!email || email === "") {
    ERROR(400, "New email is required!");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    ERROR(400, "email has already used!");
  }

  const user = await User.findByIdAndUpdate(
    request.auth?._id,
    {
      $set: {
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(new ApiResponse(200, user, "Email updated successfully!"));
});

export const changeCurrentUserName = asyncHandler(async (request, response) => {
  const { username } = request.body;

  if (!username || username === "") {
    ERROR(400, "New username is required!");
  }

  try {
    const existedUser = await User.findOne({ username });

    if (existedUser) {
      ERROR(400, "username has already used!");
    }

    const user = await User.findByIdAndUpdate(
      request.auth?._id,
      {
        $set: {
          username,
        },
      },
      {
        new: true,
      }
    ).select("-password -refreshToken");

    return response
      .status(200)
      .json(new ApiResponse(200, user, "Username updated successfully!"));
  } catch (error) {
    ERROR(
      400,
      error.message || "something went wrong on updating the username!"
    );
  }
});

export const changeCurrentAvatar = asyncHandler(async (request, response) => {
  const localAvatarPath = request.file?.path;

  if (!localAvatarPath) {
    ERROR(400, "Avatar is missing");
  }

  const avatar = await uploadOnCloudinary(localAvatarPath);

  if (!avatar.url) {
    ERROR(500, "Error while uploading avatar on cloudnary!");
  }

  const user = await User.findByIdAndUpdate(
    request.auth?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return response
    .status(200)
    .json(new ApiResponse(200, user, "Updated Avatar Successfully!"));
});

export const changeCurrentCoverImage = asyncHandler(
  async (request, response) => {
    const localCoverImage = request.file?.path;

    if (!localCoverImage) {
      ERROR(400, "Cover Image is missing");
    }

    const coverImage = await uploadOnCloudinary(localCoverImage);

    if (!coverImage.url) {
      ERROR(500, "Error while uploading cover image on cloudnary!");
    }

    const user = await User.findByIdAndUpdate(
      request.auth?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      {
        new: true,
      }
    ).select("-password -refreshToken");

    return response
      .status(200)
      .json(new ApiResponse(200, user, "Updated Cover Image Successfully!"));
  }
);

export const getUserProfile = asyncHandler(async (request, response) => {
  const { username } = request.params;

  if (!username) {
    ERROR(400, "username is missing!");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribed",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedCount: {
          $size: "$subscribed",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [request.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        isSubscribed: 1,
        subscribersCount: 1,
        subscribedCount: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!channel?.length) {
    ERROR(404, "Channel dones not exists!");
  }

  return response
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!")
    );
});

export const getWatchHistory = asyncHandler(async (request, response) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(request.auth?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user) {
    ERROR(404, "Watch history is not found!");
  }

  return response
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully!"
      )
    );
});
