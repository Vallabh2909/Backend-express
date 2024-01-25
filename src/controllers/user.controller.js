import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary, { deleteImage } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  const { fullName, email, username, password } = req.body;

  //checking if any field is empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //user with same username or email exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with same email or username exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Internal Server Error ");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(501, "Internal Server Error ");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //Get the userid password;
  //Find user usin username or email and verify password
  //Generate accessToken and refershToken to frontend using cookies

  const { username, email, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  // const user=await User.findOne(email);

  if (!user) {
    throw new ApiError(404, "No user found with such email or username");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
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

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const RefreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedRefreshToken = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingToken !== user.refreshToken) {
      throw new ApiError(401, "RefreshToken Expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "AccessToken Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(400, "Login Again");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized Access");
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Enter correct password to update the password");
  }
  user.password = newPassword;
  const passwordChanged = await user.save({ validateBeforeSave: false });

  if (!passwordChanged) {
    throw new ApiError(501, "Something went wrong while changing the password");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { success: true }, "Password Changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "No Email Recieved");
  }

  const sameEmailExists = await User.findOne({ email });

  if (sameEmailExists) {
    throw new ApiError(
      400,
      "This email is already registed with other account"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Email updated successfully"));
});

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
  }

  //TODO: delete old image - assignment
 
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
      throw new ApiError(400, "Error while uploading on avatar")
      
  }

  // const user = await User.findByIdAndUpdate(
  //     req.user?._id,
  //     {
  //         $set:{
  //             avatar: avatar.url
  //         }
  //     },
  //     {new: true}
  // ).select("-password -refreshToken")

  const user=await User.findById(req.user?._id).select("-password -refreshToken");
  await deleteImage(user.avatar)
  user.avatar=avatar.url
  user.save({validateBeforeSave:false})
  
  return res
  .status(200)
  .json(
      new ApiResponse(200, user, "Avatar image updated successfully")
  )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image file is missing")
  }

  //TODO: delete old image - assignment
 

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading on avatar")
      
  }

  // const user = await User.findByIdAndUpdate(
  //     req.user?._id,
  //     {
  //         $set:{
  //             coverImage: coverImage.url
  //         }
  //     },
  //     {new: true}
  // ).select("-password -refreshToken")
  const user=await User.findById(req.user?._id).select("-password -refreshToken");
  await deleteImage(user.coverImage)
  user.coverImage=coverImage.url
  user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(
      new ApiResponse(200, user, "Cover image updated successfully")
  )
})
export {
  registerUser,
  loginUser,
  logoutUser,
  RefreshToken,
  changePassword,
  updateUserDetails,
  getCurrentUser,updateUserAvatar,updateUserCoverImage
};
