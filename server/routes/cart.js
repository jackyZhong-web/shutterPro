const express=require("express")
const cartController=require("../controllers/cartController")

const router=express.Router()

router.get("/cart",cartController.getCart)
router.post("/cart/lines",cartController.addLine)
router.put("/cart/lines/:lineId",cartController.updateLine)
router.delete("/cart/lines/:lineId",cartController.deleteLine)
router.post("/cart/save",cartController.saveCart)
router.post("/cart/send",cartController.sendCart)

module.exports=router
