const {Color}=require("../models")

const findAll=(where)=>Color.findAll({where})
const create=(data)=>Color.create(data)
const update=(id,data)=>Color.update(data,{where:{id}})
const destroy=(id)=>Color.destroy({where:{id}})

module.exports={findAll,create,update,destroy}
