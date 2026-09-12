const {sequelize}=require("../db")
const {createId}=require("../utils")
const cartLineRepo=require("../repositories/cartLineRepo")
const orderRepo=require("../repositories/orderRepo")
const orderLineRepo=require("../repositories/orderLineRepo")
const companyRepo=require("../repositories/companyRepo")
const sequenceRepo=require("../repositories/sequenceRepo")
const {getMaterialLabel}=require("../config/materials")

const calcSqmTotal=(lines)=>lines.reduce((sum,l)=>sum+(parseFloat(l.sqm||"0")||0),0).toFixed(2)
const toPlainLine=(line)=>line&&typeof line.toJSON==="function"?line.toJSON():line
const enrichLine=(line)=>{
  const plain=toPlainLine(line)||{}
  return {...plain,productLabel:getMaterialLabel(plain.product||"")}
}

const pickLine=(source)=>({
  room:source.room||"",
  product:source.product||"",
  style:source.style||"",
  width:source.width||"",
  height:source.height||"",
  panelConfig:source.panelConfig||"",
  sqm:source.sqm||"",
  mount:source.mount||"",
  criticalMidRail:source.criticalMidRail||"",
  horizontalTpost:source.horizontalTpost||"",
  tiltOption:source.tiltOption||"",
  midRail1:source.midRail1||"",
  midRail2:source.midRail2||"",
  split1:source.split1||"",
  split2:source.split2||"",
  tierOnTier1:source.tierOnTier1||"",
  tierOnTier2:source.tierOnTier2||"",
  firstPanelOpening:source.firstPanelOpening||"",
  postPosition1:source.postPosition1||"",
  postPosition2:source.postPosition2||"",
  postPosition3:source.postPosition3||"",
  postPosition4:source.postPosition4||"",
  postPosition5:source.postPosition5||"",
  postPosition6:source.postPosition6||"",
  angle1:source.angle1||"",
  angle2:source.angle2||"",
  angle3:source.angle3||"",
  angle4:source.angle4||"",
  angle5:source.angle5||"",
  angle6:source.angle6||"",
  louvresOpening:source.louvresOpening||"",
  louvresSize:source.louvresSize||"",
  stile:source.stile||"",
  tpost:source.tpost||source.tPost||"",
  frameType:source.frameType||"",
  frameSideLeft:source.frameSideLeft||"",
  frameSideRight:source.frameSideRight||"",
  frameSideTop:source.frameSideTop||"",
  frameSideBottom:source.frameSideBottom||"",
  cilplatesLeft:source.cilplatesLeft||"",
  cilplatesRight:source.cilplatesRight||"",
  cilplatesTop:source.cilplatesTop||"",
  cilplatesBottom:source.cilplatesBottom||"",
  buildUpLeft:source.buildUpLeft||"",
  buildUpRight:source.buildUpRight||"",
  buildUpTop:source.buildUpTop||"",
  buildUpBottom:source.buildUpBottom||"",
  battensWidth:source.battensWidth||"",
  battensDepth:source.battensDepth||"",
  battensHeight:source.battensHeight||"",
  shutterColor:source.shutterColor||"",
  hingeColor:source.hingeColor||"",
  notes:source.notes||"",
  slidingOption:source.slidingOption||"",
  trackOption:source.trackOption||"",
  shapeType:source.shapeType||"",
  drawingUpload:source.drawingUpload||"",
  drawingUploadFileId:source.drawingUploadFileId||""
})

const nextOrderNo=async(companyId,abbr,transaction)=>{
  const [row,created]=await sequenceRepo.findOrCreate(companyId,transaction)
  let seq=parseInt(row.seq||"1",10)
  if(!created){
    seq+=1
    await sequenceRepo.update(companyId,{seq:String(seq)},transaction)
  }
  const padded=String(seq).padStart(4,"0")
  return `${abbr}-${padded}`
}

const listCart=async(userId)=>{
  const rows=await cartLineRepo.findByUser(userId)
  return rows.map(enrichLine)
}

const getPreviewOrderNo=async(user)=>{
  const company=await companyRepo.findOne(user.companyId)
  const abbr=company?company.abbr:"XX"
  const [row,created]=await sequenceRepo.findOrCreate(user.companyId)
  let seq=1
  if(!created){
    const current=parseInt(row.seq||"1",10)
    seq=Number.isFinite(current)?current+1:1
  }
  return `${abbr}-${String(seq).padStart(4,"0")}`
}

const addLine=async(userId,body)=>{
  const id=createId()
  await cartLineRepo.create({id,userId,...pickLine(body)})
  return id
}

const updateLine=async(userId,lineId,body)=>{
  await cartLineRepo.update(lineId,userId,pickLine(body))
  return lineId
}

const deleteLine=async(userId,lineId)=>cartLineRepo.destroy(lineId,userId)

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

const saveCart=async(user,orderMeta,status)=>{
  const lines=await cartLineRepo.findByUser(user.id)
  if(lines.length===0)throw new Error("empty_cart")
  const po=String(orderMeta&&orderMeta.po||"").trim()
  const sideMark=String(orderMeta&&orderMeta.sideMark||"").trim()
  if(!po||!sideMark)throw new Error("missing_required_order_meta")
  const date=formatLocalDateTime()
  const sqmTotal=calcSqmTotal(lines)
  const orderId=createId()
  const company=await companyRepo.findOne(user.companyId)
  const abbr=company?company.abbr:"XX"
  const result=await sequelize.transaction(async(transaction)=>{
    const orderNo=await nextOrderNo(user.companyId,abbr,transaction)
    await orderRepo.create({
      id:orderId,
      orderNo,
      companyId:user.companyId,
      userId:user.id,
      orderReference:(orderMeta&&orderMeta.orderReference)||"",
      po,
      sideMark,
      date,
      status,
      sqmTotal:String(sqmTotal)
    },transaction)
    for(const line of lines){
      await orderLineRepo.create({id:createId(),orderId,...pickLine(line)},transaction)
    }
    await cartLineRepo.destroyByUser(user.id,transaction)
    return {orderId,orderNo}
  })
  return {orderId:result.orderId,status}
}

module.exports={listCart,addLine,updateLine,deleteLine,saveCart,getPreviewOrderNo}
