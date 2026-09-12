const {initDb}=require("../db")
const authService=require("../services/authService")
const {loginSchema,changePasswordSchema}=require("../dto/schemas")
const {validate}=require("../dto/validate")

const login=async(req,res)=>{
  try{
    await initDb()
    const parsed=validate(loginSchema,req.body||{})
    if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
    const result=await authService.login(parsed.data.loginName,parsed.data.password)
    res.json(result)
  }catch(e){
    if(e.message==="invalid_request")return res.status(400).json({error:"invalid_request"})
    if(e.message==="user_not_found")return res.status(404).json({error:"user_not_found"})
    if(e.message==="password_incorrect")return res.status(401).json({error:"password_incorrect"})
    res.status(500).json({error:"server_error"})
  }
}

const me=(req,res)=>{
  res.json({id:req.user.id,role:req.user.role,companyId:req.user.companyId,customerName:req.user.customerName,email:req.user.email})
}

const changePassword=async(req,res)=>{
  try{
    await initDb()
    const parsed=validate(changePasswordSchema,req.body||{})
    if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
    await authService.changePassword(req.user.id,parsed.data.currentPassword,parsed.data.newPassword)
    res.json({success:"true"})
  }catch(e){
    if(e.message==="invalid_request")return res.status(400).json({error:"invalid_request"})
    if(e.message==="invalid_credentials")return res.status(401).json({error:"invalid_credentials"})
    if(e.message==="not_found")return res.status(404).json({error:"not_found"})
    res.status(500).json({error:"server_error"})
  }
}

module.exports={login,me,changePassword}
