const {Op}=require("sequelize")
const {Order,User,Company}=require("../models")

const findUserOrders=(userId)=>Order.findAll({where:{userId},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findUserOrder=(id,userId)=>Order.findOne({where:{id,userId},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findAllWithRelations=()=>Order.findAll({include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findAllWithRelationsByStatus=(status)=>Order.findAll({where:{status},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findAllWithRelationsByStatuses=(statuses)=>Order.findAll({where:{status:{[Op.in]:statuses}},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findByIdWithRelations=(id)=>Order.findOne({where:{id},include:[{model:User,attributes:["customerName"]},{model:Company,attributes:["name"]}]})
const findOneById=(id)=>Order.findOne({where:{id}})
const update=(id,data,whereExtra={})=>Order.update(data,{where:{id,...whereExtra}})
const create=(data,transaction)=>Order.create(data,{transaction})
const destroy=(where)=>Order.destroy({where})

module.exports={findUserOrders,findUserOrder,findAllWithRelations,findAllWithRelationsByStatus,findAllWithRelationsByStatuses,findByIdWithRelations,findOneById,update,create,destroy}
