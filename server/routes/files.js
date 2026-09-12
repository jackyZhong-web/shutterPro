const express=require("express")
const {uploader,uploaderUser}=require("../services/filesService")
const filesController=require("../controllers/filesController")

const router=express.Router()

router.post("/",uploader.single("file"),filesController.uploadFile)
router.post("/userupload",uploaderUser.single("file"),filesController.uploadUserFile)
router.get("/:id",filesController.getFile)

module.exports=router
