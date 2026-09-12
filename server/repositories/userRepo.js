const {User}=require("../models")

const findByLoginName=async(loginName)=>{
  const byEmail=await User.findOne({where:{email:loginName}})
  if(byEmail)return byEmail
  return User.findOne({where:{customerName:loginName}})
}
const findOne=(id)=>User.findOne({where:{id}})
const findAll=()=>User.findAll({attributes:["id","companyId","role","customerName","email","phone"]})
const create=(data)=>User.create(data)
const update=(id,data)=>User.update(data,{where:{id}})
const destroy=(id)=>User.destroy({where:{id}})

module.exports={findByLoginName,findOne,findAll,create,update,destroy}
