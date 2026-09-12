const path=require("path")
const fs=require("fs")
const ExcelJS=require("exceljs")
const orderRepo=require("../repositories/orderRepo")
const orderLineRepo=require("../repositories/orderLineRepo")
const companyRepo=require("../repositories/companyRepo")
const userRepo=require("../repositories/userRepo")
const excelExportRepo=require("../repositories/excelExportRepo")
const fileRepo=require("../repositories/fileRepo")
const {createId,safeJsonParse,parseCell}=require("../utils")
const {getMaterialLabel}=require("../config/materials")
const exportDiagEnabled=process.env.EXPORT_DIAG==="true"
const exportDiagPath=path.join(__dirname,"..","logs","export-diagnostic.log")
const writeExportDiag=(payload={})=>{
  if(!exportDiagEnabled)return
  try{
    const logsDir=path.dirname(exportDiagPath)
    if(!fs.existsSync(logsDir))fs.mkdirSync(logsDir,{recursive:true})
    const entry={timestamp:new Date().toISOString(),tag:"export_diag",...payload}
    fs.appendFileSync(exportDiagPath,`${JSON.stringify(entry)}\n`,"utf8")
  }catch(e){}
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
const toPlainLine=(line)=>line&&typeof line.toJSON==="function"?line.toJSON():line
const enrichLine=(line)=>{
  const plain=toPlainLine(line)||{}
  return {...plain,productLabel:getMaterialLabel(plain.product||"")}
}

const normalizeStatus=(status)=>{
  if(status==="sended")return "sent"
  if(status==="pendding")return "pending"
  return status||""
}
const isPending=(status)=>status==="pending"||status==="pendding"
const isSent=(status)=>status==="sent"||status==="sended"

const listUserOrders=async(userId)=>{
  const rows=await orderRepo.findUserOrders(userId)
  return rows.map(r=>({...r.toJSON(),status:normalizeStatus(r.status),customerName:r.User?r.User.customerName:"",companyName:r.Company?r.Company.name:""}))
}
const getUserOrderDetail=async(id,userId)=>{
  const order=await orderRepo.findUserOrder(id,userId)
  if(!order)return null
  const lines=await orderLineRepo.findByOrderId(id)
  return {...order.toJSON(),status:normalizeStatus(order.status),customerName:order.User?order.User.customerName:"",companyName:order.Company?order.Company.name:"",lines:lines.map(enrichLine)}
}
const updateOrder=async(id,userId,body)=>{
  const row=await orderRepo.findUserOrder(id,userId)
  if(!row)return "not_found"
  if(!isPending(row.status))return "cannot_edit_submitted"
  const lines=Array.isArray(body.lines)?body.lines:[]
  const sqmTotal=lines.reduce((sum,l)=>sum+(parseFloat(l.sqm||"0")||0),0).toFixed(2)
  await orderRepo.update(id,{orderReference:body.orderReference||"",sqmTotal:String(sqmTotal)},{userId})
  await orderLineRepo.destroyByOrderId(id)
  for(const line of lines){
    await orderLineRepo.create({id:createId(),orderId:id,...pickLine(line)})
  }
  return "pending"
}
const submitOrder=async(id,userId)=>{
  const row=await orderRepo.findUserOrder(id,userId)
  if(!row)return "not_found"
  if(!isPending(row.status))return "cannot_submit"
  await orderRepo.update(id,{status:"sent"},{userId})
  return "sent"
}
const deleteOrder=async(id,userId)=>{
  const row=await orderRepo.findUserOrder(id,userId)
  if(!row)return "not_found"
  if(isSent(row.status))return "cannot_delete_submitted"
  await orderRepo.destroy({id,userId})
  await orderLineRepo.destroyByOrderId(id)
  return "true"
}
const listAdminOrders=async()=>{
  const rows=await orderRepo.findAllWithRelationsByStatuses(["sent","sended"])
  return rows.map(r=>({...r.toJSON(),status:normalizeStatus(r.status),customerName:r.User?r.User.customerName:"",companyName:r.Company?r.Company.name:""}))
}
const getAdminOrderDetail=async(id)=>{
  const order=await orderRepo.findByIdWithRelations(id)
  if(!order)return null
  const lines=await orderLineRepo.findByOrderId(id)
  return {...order.toJSON(),status:normalizeStatus(order.status),customerName:order.User?order.User.customerName:"",companyName:order.Company?order.Company.name:"",lines:lines.map(enrichLine)}
}
const updateAdminMark=async(id,mark)=>{
  await orderRepo.update(id,{mark:mark||""})
  return "true"
}
const adminDeleteOrder=async(id)=>{
  await orderRepo.destroy({id})
  await orderLineRepo.destroyByOrderId(id)
  return "true"
}
const exportOrder=async(id,userRole,userId)=>{
  writeExportDiag({stage:"start",orderId:id,userRole,userId})
  const order=await orderRepo.findOneById(id)
  if(order&&userRole!=="Admin"&&order.userId!==userId){writeExportDiag({stage:"auth_blocked",orderId:id,orderUserId:order.userId});return {error:"not_found"}}
  if(!order){writeExportDiag({stage:"order_missing",orderId:id});return {error:"not_found"}}
  const company=await companyRepo.findOne(order.companyId)
  const user=await userRepo.findOne(order.userId)
  const lines=await orderLineRepo.findByOrderId(id)
  const exportCfg=await excelExportRepo.findOne()
  if(!exportCfg){writeExportDiag({stage:"export_cfg_missing",orderId:id});return {error:"export_config_missing"}}
  const rules=safeJsonParse(exportCfg.ruleJson)
  const orderFields=Array.isArray(rules.orderFields)?rules.orderFields:[]
  const lineFields=Array.isArray(rules.lineFields)?rules.lineFields:[]
  writeExportDiag({stage:"rules_loaded",orderId:id,orderFieldsCount:orderFields.length,lineFieldsCount:lineFields.length,templateFileId:exportCfg.templateFileId||""})
  if(orderFields.length===0&&lineFields.length===0){writeExportDiag({stage:"mapping_empty",orderId:id});return {error:"mapping_rules_empty"}}
  const templateFile=await fileRepo.findOne(exportCfg.templateFileId)
  if(!templateFile){writeExportDiag({stage:"template_row_missing",orderId:id,templateFileId:exportCfg.templateFileId||""});return {error:"template_missing"}}
  if(!templateFile.filePath||!fs.existsSync(templateFile.filePath)){writeExportDiag({stage:"template_path_missing",orderId:id,templateFilePath:templateFile.filePath||""});return {error:"template_missing"}}
  const ext=path.extname(templateFile.fileName||templateFile.filePath||"").toLowerCase()
  if(ext && ext !== ".xlsx"){writeExportDiag({stage:"template_unsupported",orderId:id,ext});return {error:"template_unsupported"}}
  const wb=new ExcelJS.Workbook()
  try{
    await wb.xlsx.readFile(templateFile.filePath)
  }catch(e){
    writeExportDiag({stage:"template_read_failed",orderId:id,templateFilePath:templateFile.filePath||"",detail:String(e&&e.message?e.message:e)})
    return {error:"template_invalid"}
  }
  const ws=wb.worksheets[0]
  if(!ws){writeExportDiag({stage:"worksheet_missing",orderId:id});return {error:"template_invalid"}}
  const orderMap={
    ...order.toJSON(),
    customerName:user?user.customerName:"",
    companyName:company?company.name:""
  }
  const lineList=lines.map(l=>{
    const line=toPlainLine(l)||{}
    const productLabel=getMaterialLabel(line.product||"")
    return {...line,productCode:line.product||"",productLabel,product:productLabel}
  })
  const writeCell=(cellName,value)=>{
    const cell=parseCell(cellName)
    if(!cell)return
    ws.getCell(`${cell.col}${cell.row}`).value=String(value??"")
  }
  const writeColumnFrom=(startCell,rowOffset,value)=>{
    const cell=parseCell(startCell)
    if(!cell)return
    ws.getCell(`${cell.col}${cell.row+rowOffset}`).value=String(value??"")
  }
  orderFields.forEach(field=>{
    const cellName=field.startFrom||field.cell||""
    if(!cellName)return
    const value=orderMap[field.systemName]
    writeCell(cellName,value)
  })
  lineFields.forEach(field=>{
    const startCell=field.startCell||field.startFrom||field.cell||""
    if(!startCell)return
    lineList.forEach((lineItem,index)=>{
      const value=lineItem[field.systemName]
      writeColumnFrom(startCell,index,value)
    })
  })
  const outId=createId()
  const uploadDir=path.join(__dirname,"..","uploads")
  if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true})
  const outPath=path.join(uploadDir,`${outId}.xlsx`)
  try{
    await wb.xlsx.writeFile(outPath)
  }catch(e){
    writeExportDiag({stage:"write_file_failed",orderId:id,outPath,detail:String(e&&e.message?e.message:e)})
    return {error:"export_failed"}
  }
  try{
    const stat=fs.statSync(outPath)
    writeExportDiag({stage:"file_written",orderId:id,outPath,size:stat.size,linesCount:lineList.length})
  }catch(e){
    writeExportDiag({stage:"file_written_stat_failed",orderId:id,outPath})
  }
  try{
    await fileRepo.create({id:outId,fileName:`${order.orderNo}.xlsx`,filePath:outPath,fileType:"export"})
  }catch(e){
    writeExportDiag({stage:"file_row_create_failed",orderId:id,outId,outPath,detail:String(e&&e.message?e.message:e)})
    return {error:"export_failed"}
  }
  writeExportDiag({stage:"success",orderId:id,outId,downloadUrl:`/files/${outId}`})
  return {fileId:outId,downloadUrl:`/files/${outId}`}
}

module.exports={listUserOrders,getUserOrderDetail,updateOrder,submitOrder,deleteOrder,listAdminOrders,getAdminOrderDetail,adminDeleteOrder,exportOrder,updateAdminMark}
