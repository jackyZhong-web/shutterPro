const {sequelize}=require("../db")
const remakeRepo=require("../repositories/remakeRepo")
const orderRepo=require("../repositories/orderRepo")
const orderLineRepo=require("../repositories/orderLineRepo")
const fileRepo=require("../repositories/fileRepo")
const {createId,safeJsonParse}=require("../utils")

const formatLocalDateTime=()=>{
  const d=new Date()
  const pad=n=>String(n).padStart(2,"0")
  const offsetMin=-d.getTimezoneOffset()
  const sign=offsetMin>=0?"+":"-"
  const abs=Math.abs(offsetMin)
  const offH=pad(Math.floor(abs/60))
  const offM=pad(abs%60)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${offH}:${offM}`
}
const normalizeTypes=(value)=>{
  const list=Array.isArray(value)?value:[]
  return list.map(v=>String(v||"").trim()).filter(Boolean)
}
const parseTypes=(raw)=>{
  const parsed=safeJsonParse(raw)
  if(Array.isArray(parsed))return parsed.map(v=>String(v||"").trim()).filter(Boolean)
  return []
}
const formatRemake=(row)=>{
  const data=row.toJSON?row.toJSON():row
  const types=parseTypes(data.typeList)
  return {
    ...data,
    types,
    typesText:types.join(" / "),
    customerName:data.User?data.User.customerName:"",
    companyName:data.Company?data.Company.name:"",
    companyAbbr:data.Company?data.Company.abbr:""
  }
}

const createRemake=async(user,body)=>{
  const orderId=body.orderId||""
  const lineId=body.lineId||""
  const note=String(body.note||"").trim()
  const types=normalizeTypes(body.types)
  const fileId=body.fileId||""
  if(!orderId)return "order_required"
  if(!lineId)return "line_required"
  if(!note)return "note_required"
  if(types.length===0)return "types_required"
  const order=await orderRepo.findUserOrder(orderId,user.id)
  if(!order)return "not_found"
  const lines=await orderLineRepo.findByOrderId(orderId)
  const idx=lines.findIndex(l=>l.id===lineId)
  if(idx<0)return "line_not_found"
  const line=lines[idx]
  let fileName=""
  if(fileId){
    const file=await fileRepo.findOne(fileId)
    if(!file)return "file_not_found"
    fileName=file.fileName||""
  }
  const date=formatLocalDateTime()
  const result=await sequelize.transaction(async(transaction)=>{
    const nextIndex=await remakeRepo.findMaxIndexByOrderId(orderId,transaction)+1
    const seq=String(nextIndex).padStart(2,"0")
    const remakeNo=`RM${seq}-${order.orderNo||""}`
    const lineLabel=`Shutter #${idx+1} · ${line.room||""} · ${line.style||""}`
    const id=createId()
    await remakeRepo.create({
      id,
      remakeNo,
      remakeIndex:nextIndex,
      orderId,
      orderNo:order.orderNo||"",
      companyId:order.companyId||"",
      userId:user.id,
      lineId,
      lineLabel,
      typeList:JSON.stringify(types),
      note,
      comment:"",
      status:"sent",
      fileId,
      fileName,
      date
    },transaction)
    return {id,remakeNo,status:"sent"}
  })
  return result
}

const listUserRemakes=async(userId)=>{
  const rows=await remakeRepo.findByUser(userId)
  return rows.map(formatRemake)
}
const listAdminRemakes=async(filters)=>{
  const rows=await remakeRepo.findAll(filters)
  return rows.map(formatRemake)
}
const getAdminRemake=async(id)=>{
  const row=await remakeRepo.findById(id)
  if(!row)return null
  return formatRemake(row)
}
const approveRemake=async(id)=>{
  const row=await remakeRepo.findById(id)
  if(!row)return "not_found"
  if(row.status!=="sent")return "invalid_status"
  await remakeRepo.update(id,{status:"approved"})
  return "approved"
}
const refuseRemake=async(id,comment)=>{
  const text=String(comment||"").trim()
  if(!text)return "comment_required"
  const row=await remakeRepo.findById(id)
  if(!row)return "not_found"
  if(row.status!=="sent")return "invalid_status"
  await remakeRepo.update(id,{status:"refused",comment:text})
  return "refused"
}

module.exports={createRemake,listUserRemakes,listAdminRemakes,getAdminRemake,approveRemake,refuseRemake}
