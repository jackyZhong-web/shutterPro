const express=require("express")
const {adminOnly}=require("../middleware")
const remakesController=require("../controllers/remakesController")

const router=express.Router()

router.post("/remakes",remakesController.createRemake)
router.get("/remakes",remakesController.listUserRemakes)
router.get("/admin/remakes",adminOnly,remakesController.listAdminRemakes)
router.get("/admin/remakes/:id",adminOnly,remakesController.getAdminRemake)
router.put("/admin/remakes/:id/approve",adminOnly,remakesController.approveRemake)
router.put("/admin/remakes/:id/refuse",adminOnly,remakesController.refuseRemake)

module.exports=router
