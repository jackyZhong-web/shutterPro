const express=require("express")
const catalogController=require("../controllers/catalogController")

const router=express.Router()

router.get("/profiles",catalogController.getProfiles)
router.get("/colors",catalogController.getColors)
router.get("/materials",catalogController.getMaterials)

module.exports=router
