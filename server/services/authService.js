const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const userRepo=require("../repositories/userRepo")
const {JWT_SECRET}=require("../middleware")

const login=async(loginName,password)=>{
  if(!loginName||!password)throw new Error("invalid_request")
  const user=await userRepo.findByLoginName(loginName)
  if(!user)throw new Error("user_not_found")
  const ok=await bcrypt.compare(password,user.passwordHash)
  if(!ok)throw new Error("password_incorrect")
  const token=jwt.sign({id:user.id,role:user.role,companyId:user.companyId,customerName:user.customerName,email:user.email},JWT_SECRET,{expiresIn:"8h"})
  return {token,role:user.role,user:{id:user.id,companyId:user.companyId,customerName:user.customerName,email:user.email}}
}

const changePassword=async(userId,currentPassword,newPassword)=>{
  if(!userId||!currentPassword||!newPassword)throw new Error("invalid_request")
  const user=await userRepo.findOne(userId)
  if(!user)throw new Error("not_found")
  const ok=await bcrypt.compare(currentPassword,user.passwordHash)
  if(!ok)throw new Error("invalid_credentials")
  const hash=await bcrypt.hash(newPassword,10)
  await userRepo.update(userId,{passwordHash:hash})
  return true
}

module.exports={login,changePassword}
