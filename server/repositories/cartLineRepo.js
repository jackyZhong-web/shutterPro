const {CartLine}=require("../models")

const findByUser=(userId)=>CartLine.findAll({where:{userId}})
const create=(data)=>CartLine.create(data)
const update=(id,userId,data)=>CartLine.update(data,{where:{id,userId}})
const destroy=(id,userId)=>CartLine.destroy({where:{id,userId}})
const destroyByUser=(userId,transaction)=>CartLine.destroy({where:{userId},transaction})

module.exports={findByUser,create,update,destroy,destroyByUser}
