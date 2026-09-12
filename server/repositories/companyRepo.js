const {Company}=require("../models")

const findAll=()=>Company.findAll()
const create=(data)=>Company.create(data)
const update=(id,data)=>Company.update(data,{where:{id}})
const destroy=(id)=>Company.destroy({where:{id}})
const findOne=(id)=>Company.findOne({where:{id}})

module.exports={findAll,create,update,destroy,findOne}
