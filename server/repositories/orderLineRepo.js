const {OrderLine}=require("../models")

const findByOrderId=(orderId)=>OrderLine.findAll({where:{orderId}})
const create=(data,transaction)=>OrderLine.create(data,{transaction})
const destroyByOrderId=(orderId)=>OrderLine.destroy({where:{orderId}})

module.exports={findByOrderId,create,destroyByOrderId}
