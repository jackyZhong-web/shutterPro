const {File}=require("../models")

const findOne=(id)=>File.findOne({where:{id}})
const create=(data)=>File.create(data)
const destroy=(id)=>File.destroy({where:{id}})

module.exports={findOne,create,destroy}
