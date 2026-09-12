const {initDb}=require("../db")
const remakesService=require("../services/remakesService")
const {remakeCreateSchema,remakeRefuseSchema}=require("../dto/schemas")
const {validate}=require("../dto/validate")

const createRemake=async(req,res)=>{
  await initDb()
  const parsed=validate(remakeCreateSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const result=await remakesService.createRemake(req.user,parsed.data)
  const errors={
    order_required:400,
    line_required:400,
    note_required:400,
    types_required:400,
    file_not_found:404,
    line_not_found:404,
    not_found:404
  }
  if(errors[result])return res.status(errors[result]).json({error:result})
  res.json(result)
}
const listUserRemakes=async(req,res)=>{
  await initDb()
  const rows=await remakesService.listUserRemakes(req.user.id)
  res.json(rows)
}
const listAdminRemakes=async(req,res)=>{
  await initDb()
  const keyword=String(req.query.q||"").trim()
  const date=String(req.query.date||"").trim()
  const rows=await remakesService.listAdminRemakes({keyword,date})
  res.json(rows)
}
const getAdminRemake=async(req,res)=>{
  await initDb()
  const row=await remakesService.getAdminRemake(req.params.id)
  if(!row)return res.status(404).json({error:"not_found"})
  res.json(row)
}
const approveRemake=async(req,res)=>{
  await initDb()
  const result=await remakesService.approveRemake(req.params.id)
  if(result==="not_found")return res.status(404).json({error:"not_found"})
  if(result==="invalid_status")return res.status(400).json({error:"invalid_status"})
  res.json({status:"approved"})
}
const refuseRemake=async(req,res)=>{
  await initDb()
  const parsed=validate(remakeRefuseSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const result=await remakesService.refuseRemake(req.params.id,parsed.data.comment)
  if(result==="comment_required")return res.status(400).json({error:"comment_required"})
  if(result==="not_found")return res.status(404).json({error:"not_found"})
  if(result==="invalid_status")return res.status(400).json({error:"invalid_status"})
  res.json({status:"refused"})
}

module.exports={createRemake,listUserRemakes,listAdminRemakes,getAdminRemake,approveRemake,refuseRemake}
