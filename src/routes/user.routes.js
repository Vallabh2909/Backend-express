import { Router } from "express";
import { loginUser, registerUser,logoutUser,RefreshToken, changePassword, updateUserDetails,updateUserAvatar,updateUserCoverImage} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/register").post(upload.fields([
{
    name:"avatar",
    maxCount:1
},
{
    name:"coverImage",
    maxCount:1
}
]),registerUser);

router.route("/login").post(loginUser);

//Secure
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-access-token").post(RefreshToken);
router.route("/change-password").post(verifyJWT,changePassword);
router.route("/change-email").post(verifyJWT,updateUserDetails);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

export default router;