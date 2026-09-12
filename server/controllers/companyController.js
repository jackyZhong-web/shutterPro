const {initDb}=require("../db")
const companyRepo=require("../repositories/companyRepo")

const getCurrentCompany=async(req,res)=>{
  await initDb()
  const companyId=req.user&&req.user.companyId
  if(!companyId)return res.json({id:"",name:"",country:""})
  const row=await companyRepo.findOne(companyId)
  res.json({id:row?row.id:companyId,name:row&&(row.name||""),country:row&&(row.country||"")})
}

const companyConfigService=require("../services/companyConfigService")

const getCompanyConfig=async(req,res)=>{
  await initDb()
  const companyId=req.user&&req.user.companyId
  if(!companyId)return res.json(null)
  const row=await companyConfigService.getCompanyConfig(companyId)
  res.json(row||null)
}

module.exports={getCurrentCompany,getCompanyConfig}
