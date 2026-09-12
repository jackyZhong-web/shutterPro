const express=require("express")
const {authMiddleware}=require("../middleware")
const authController=require("../controllers/authController")

const router=express.Router()

router.post("/login",authController.login)
router.get("/me",authMiddleware,authController.me)
router.put("/change-password",authMiddleware,authController.changePassword)

module.exports=router
