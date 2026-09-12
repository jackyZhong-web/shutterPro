const crypto=require("crypto")

const createId=()=>crypto.randomUUID()
const safeJsonParse=(value)=>{if(!value)return{};try{return JSON.parse(value)}catch(e){return{}}}
const parseCell=(cell)=>{
  const match=String(cell||"").toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if(!match)return null
  return {col:match[1],row:parseInt(match[2],10)}
}
const getOrderFieldValue=(order,companyName)=>{
  return {
    orderNo:order.orderNo||"",
    customerName:order.customerName||"",
    companyName:companyName||"",
    date:order.date||"",
    orderReference:order.orderReference||"",
    sqmTotal:order.sqmTotal||""
  }
}
const getLineFieldValue=(line)=>{
  return {
    room:line.room||"",
    product:line.product||"",
    style:line.style||"",
    width:line.width||"",
    height:line.height||"",
    panelConfig:line.panelConfig||"",
    sqm:line.sqm||"",
    mount:line.mount||"",
    criticalMidRail:line.criticalMidRail||"",
    horizontalTpost:line.horizontalTpost||"",
    tiltOption:line.tiltOption||"",
    midRail1:line.midRail1||"",
    midRail2:line.midRail2||"",
    split1:line.split1||"",
    split2:line.split2||"",
    tierOnTier1:line.tierOnTier1||"",
    tierOnTier2:line.tierOnTier2||"",
    firstPanelOpening:line.firstPanelOpening||"",
    postPosition1:line.postPosition1||"",
    postPosition2:line.postPosition2||"",
    postPosition3:line.postPosition3||"",
    postPosition4:line.postPosition4||"",
    postPosition5:line.postPosition5||"",
    postPosition6:line.postPosition6||"",
    louvresOpening:line.louvresOpening||"",
    louvresSize:line.louvresSize||"",
    stile:line.stile||"",
    tpost:line.tpost||line.tPost||"",
    frameType:line.frameType||"",
    frameSideLeft:line.frameSideLeft||"",
    frameSideRight:line.frameSideRight||"",
    frameSideTop:line.frameSideTop||"",
    frameSideBottom:line.frameSideBottom||"",
    cilplatesLeft:line.cilplatesLeft||"",
    cilplatesRight:line.cilplatesRight||"",
    cilplatesTop:line.cilplatesTop||"",
    cilplatesBottom:line.cilplatesBottom||"",
    buildUpLeft:line.buildUpLeft||"",
    buildUpRight:line.buildUpRight||"",
    buildUpTop:line.buildUpTop||"",
    buildUpBottom:line.buildUpBottom||"",
    battensWidth:line.battensWidth||"",
    battensDepth:line.battensDepth||"",
    battensHeight:line.battensHeight||"",
    shutterColor:line.shutterColor||"",
    hingeColor:line.hingeColor||"",
    notes:line.notes||"",
    slidingOption:line.slidingOption||"",
    trackOption:line.trackOption||"",
    shapeType:line.shapeType||"",
    drawingUpload:line.drawingUpload||""
  }
}
const writeOrderFields=(ws,orderFields,orderMap)=>{
  for(const field of orderFields){
    const cell=parseCell(field.cell)
    if(!cell)continue
    const value=orderMap[field.systemName]??""
    ws.getCell(`${cell.col}${cell.row}`).value=String(value)
  }
}
const writeLineFields=(ws,lineFields,lines)=>{
  for(const field of lineFields){
    const cell=parseCell(field.startCell)
    if(!cell)continue
    lines.forEach((line,index)=>{
      const lineMap=getLineFieldValue(line)
      const value=lineMap[field.systemName]??""
      ws.getCell(`${cell.col}${cell.row+index}`).value=String(value)
    })
  }
}

module.exports={createId,safeJsonParse,parseCell,getOrderFieldValue,getLineFieldValue,writeOrderFields,writeLineFields}
