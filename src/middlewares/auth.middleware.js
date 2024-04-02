import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  console.log(req.cookies);
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }
      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        const refreshToken =
          req.cookies?.refreshToken ||
          req.header("Authorization")?.replace("Bearer", "");

        if (!refreshToken) {
          throw new ApiError(401, "Unauthorized Request");
        }
        try {
          const decodedToken = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
          );
          const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
          );
          if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
          }
          const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          };
          const accessToken = user.generateAccessToken();
          return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .json(
              new ApiResponse(200, 51, "Access Token Refreshed Successfully")
            );
        } catch (error) {
          const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
          };
          if (error.name === "TokenExpiredError") {
            return res
              .cookie("accessToken", "", options)
              .cookie("refreshToken", "", options)
              .json(new ApiResponse(401, 22, "Sign In Again to Continue"));
          } else if (error.name === "JsonWebTokenError") {
            return res
              .cookie("accessToken", "", options)
              .cookie("refreshToken", "", options)
              .json(new ApiResponse(401, 22, "Sign In Again to Continue"));
          }
        }
      } else if (error.name === "JsonWebTokenError") {
        const options = {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        };
        return res
          .status(200)
          .cookie("accessToken", "", options)
          .cookie("refreshToken", "", options)
          .json(new ApiResponse(401, 22, "Unauthorized Request"));
      }
    }
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
