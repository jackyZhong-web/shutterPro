const {CompanyConfig}=require("../models")

const findOne=(companyId)=>CompanyConfig.findOne({where:{companyId}})
const create=(data)=>CompanyConfig.create(data)
const update=(companyId,data)=>CompanyConfig.update(data,{where:{companyId}})

module.exports={findOne,create,update}
