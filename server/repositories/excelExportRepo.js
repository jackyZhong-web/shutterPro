const {ExcelExport}=require("../models")

const findOne=()=>ExcelExport.findOne()
const create=(data)=>ExcelExport.create(data)
const update=(id,data)=>ExcelExport.update(data,{where:{id}})

module.exports={findOne,create,update}
