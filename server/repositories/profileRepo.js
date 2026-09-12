const {Profile}=require("../models")

const findAll=(where)=>Profile.findAll({where})
const create=(data)=>Profile.create(data)
const update=(id,data)=>Profile.update(data,{where:{id}})
const destroy=(id)=>Profile.destroy({where:{id}})

module.exports={findAll,create,update,destroy}
