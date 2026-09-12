const express=require("express")
const ordersController=require("../controllers/ordersController")

const router=express.Router()

router.get("/orders",ordersController.listOrders)
router.get("/orders/:id",ordersController.getOrder)
router.put("/orders/:id",ordersController.updateOrder)
router.post("/orders/:id/send",ordersController.sendOrder)
router.delete("/orders/:id",ordersController.deleteOrder)
router.get("/admin/orders",ordersController.listAdminOrders)
router.get("/admin/orders/:id",ordersController.getAdminOrder)
router.put("/admin/orders/:id/mark",ordersController.updateAdminMark)
router.delete("/admin/orders/:id",ordersController.deleteAdminOrder)
router.post("/orders/:id/export",ordersController.exportOrder)

module.exports=router
