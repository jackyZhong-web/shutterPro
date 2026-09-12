const {Op,fn,col}=require("sequelize")
const {Remake,User,Company}=require("../models")

const create=(data,transaction)=>Remake.create(data,{transaction})
const findById=(id)=>Remake.findOne({where:{id},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name","abbr"]}]})
const findByUser=(userId)=>Remake.findAll({where:{userId},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name","abbr"]}]})
const findAll=(filters={})=>{
  const where={}
  if(filters.date) where.date={ [Op.like]: `${filters.date}%` }
  if(filters.keyword){
    const q=`%${filters.keyword}%`
    where[Op.or]=[
      {remakeNo:{[Op.like]:q}},
      {orderNo:{[Op.like]:q}},
      {"$User.customerName$":{[Op.like]:q}},
      {"$Company.name$":{[Op.like]:q}}
    ]
  }
  return Remake.findAll({where,include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name","abbr"]}]})
}
const findMaxIndexByOrderId=async(orderId,transaction)=>{
  const row=await Remake.findOne({
    where:{orderId},
    attributes:[[fn("MAX",col("remakeIndex")),"maxIndex"]],
    transaction
  })
  const value=row?row.get("maxIndex"):null
  return Number(value||0)
}
const update=(id,data,transaction)=>Remake.update(data,{where:{id},transaction})

module.exports={create,findById,findByUser,findAll,findMaxIndexByOrderId,update}
