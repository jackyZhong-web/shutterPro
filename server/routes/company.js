const express=require("express")
const companyController=require("../controllers/companyController")

const router=express.Router()

router.get("/company/current",companyController.getCurrentCompany)
router.get("/company/config",companyController.getCompanyConfig)

module.exports=router
