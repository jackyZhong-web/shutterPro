const {initDb}=require("../db")
const ordersService=require("../services/ordersService")
const {orderUpdateSchema}=require("../dto/schemas")
const {validate}=require("../dto/validate")

const listOrders=async(req,res)=>{
  await initDb()
  const data=await ordersService.listUserOrders(req.user.id)
  res.json(data)
}
const getOrder=async(req,res)=>{
  await initDb()
  const result=await ordersService.getUserOrderDetail(req.params.id,req.user.id)
  if(!result)return res.status(404).json({error:"not_found"})
  res.json(result)
}
const updateOrder=async(req,res)=>{
  await initDb()
  const parsed=validate(orderUpdateSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const result=await ordersService.updateOrder(req.params.id,req.user.id,parsed.data)
  if(result==="not_found")return res.status(404).json({error:"not_found"})
  if(result==="cannot_edit_submitted")return res.status(400).json({error:"cannot_edit_submitted"})
  res.json({id:req.params.id,status:"pending"})
}
const sendOrder=async(req,res)=>{
  await initDb()
  const result=await ordersService.submitOrder(req.params.id,req.user.id)
  if(result==="not_found")return res.status(404).json({error:"not_found"})
  if(result==="cannot_submit")return res.status(400).json({error:"cannot_submit"})
  res.json({id:req.params.id,status:"sent"})
}
const deleteOrder=async(req,res)=>{
  await initDb()
  const result=await ordersService.deleteOrder(req.params.id,req.user.id)
  if(result==="not_found")return res.status(404).json({error:"not_found"})
  if(result==="cannot_delete_submitted")return res.status(400).json({error:"cannot_delete_submitted"})
  res.json({success:"true"})
}
const listAdminOrders=async(req,res)=>{
  await initDb()
  const data=await ordersService.listAdminOrders()
  res.json(data)
}
const getAdminOrder=async(req,res)=>{
  await initDb()
  const result=await ordersService.getAdminOrderDetail(req.params.id)
  if(!result)return res.status(404).json({error:"not_found"})
  res.json(result)
}
const deleteAdminOrder=async(req,res)=>{
  await initDb()
  await ordersService.adminDeleteOrder(req.params.id)
  res.json({success:"true"})
}
const exportOrder=async(req,res)=>{
  try{
    await initDb()
    const result=await ordersService.exportOrder(req.params.id,req.user.role,req.user.id)
    if(result.error==="not_found")return res.status(404).json({error:"not_found"})
    if(result.error)return res.status(400).json({error:result.error})
    res.json(result)
  }catch(e){
    res.status(500).json({error:"export_failed"})
  }
}

const updateAdminMark=async(req,res)=>{
  await initDb()
  const mark=(req.body&&req.body.mark)||""
  await ordersService.updateAdminMark(req.params.id,mark)
  res.json({success:"true"})
}

module.exports={listOrders,getOrder,updateOrder,sendOrder,deleteOrder,listAdminOrders,getAdminOrder,deleteAdminOrder,exportOrder,updateAdminMark}
