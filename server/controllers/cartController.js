const {initDb}=require("../db")
const cartService=require("../services/cartService")
const {lineSchema,orderMetaSchema}=require("../dto/schemas")
const {validate}=require("../dto/validate")

const getCart=async(req,res)=>{
  await initDb()
  const lines=await cartService.listCart(req.user.id)
  const orderNo=await cartService.getPreviewOrderNo(req.user)
  res.json({lines,orderNo})
}
const addLine=async(req,res)=>{
  await initDb()
  const parsed=validate(lineSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const id=await cartService.addLine(req.user.id,parsed.data)
  res.json({id})
}
const updateLine=async(req,res)=>{
  await initDb()
  const parsed=validate(lineSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const id=await cartService.updateLine(req.user.id,req.params.lineId,parsed.data)
  res.json({id})
}
const deleteLine=async(req,res)=>{
  await initDb()
  await cartService.deleteLine(req.user.id,req.params.lineId)
  res.json({success:"true"})
}
const saveCart=async(req,res)=>{
  try{
    await initDb()
    const parsed=validate(orderMetaSchema,req.body||{})
    if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
    const po=String(parsed.data.po||"").trim()
    const sideMark=String(parsed.data.sideMark||"").trim()
    if(!po||!sideMark)return res.status(400).json({error:"missing_required_order_meta"})
    const result=await cartService.saveCart(req.user,{orderReference:parsed.data.orderReference,po,sideMark},"pending")
    res.json(result)
  }catch(e){
    if(e.message==="empty_cart")return res.status(400).json({error:"empty_cart"})
    if(e.message==="missing_required_order_meta")return res.status(400).json({error:"missing_required_order_meta"})
    res.status(500).json({error:"server_error"})
  }
}
const sendCart=async(req,res)=>{
  try{
    await initDb()
    const parsed=validate(orderMetaSchema,req.body||{})
    if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
    const po=String(parsed.data.po||"").trim()
    const sideMark=String(parsed.data.sideMark||"").trim()
    if(!po||!sideMark)return res.status(400).json({error:"missing_required_order_meta"})
    const result=await cartService.saveCart(req.user,{orderReference:parsed.data.orderReference,po,sideMark},"sent")
    res.json(result)
  }catch(e){
    if(e.message==="empty_cart")return res.status(400).json({error:"empty_cart"})
    if(e.message==="missing_required_order_meta")return res.status(400).json({error:"missing_required_order_meta"})
    res.status(500).json({error:"server_error"})
  }
}

module.exports={getCart,addLine,updateLine,deleteLine,saveCart,sendCart}
