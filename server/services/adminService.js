const bcrypt=require("bcryptjs")
const companyRepo=require("../repositories/companyRepo")
const userRepo=require("../repositories/userRepo")
const profileRepo=require("../repositories/profileRepo")
const colorRepo=require("../repositories/colorRepo")
const excelExportRepo=require("../repositories/excelExportRepo")
const {createId}=require("../utils")

const createDefaultColorMap=()=>({
  default:{shutter:[],hinge:[],tilt:[],louverOpening:"Both"},
  byProduct:{}
})
const profileNameCollator=new Intl.Collator("en",{numeric:true,sensitivity:"base"})
const toTimeValue=(value)=>{
  const ts=Date.parse(String(value||""))
  return Number.isFinite(ts)?ts:0
}
const sortProfiles=(rows)=>rows.slice().sort((a,b)=>{
  const nameCompare=profileNameCollator.compare(String(a&&a.name||"").trim(),String(b&&b.name||"").trim())
  if(nameCompare!==0)return nameCompare
  const createdAtCompare=toTimeValue(a&&a.createdAt)-toTimeValue(b&&b.createdAt)
  if(createdAtCompare!==0)return createdAtCompare
  return String(a&&a.id||"").localeCompare(String(b&&b.id||""),"en",{sensitivity:"base"})
})

const listCompanies=()=>companyRepo.findAll()
const createCompany=async(body)=>{
  const id=body.id
  await companyRepo.create({id,name:body.name||"",abbr:body.abbr||"",contact:body.contact||"",street:body.street||"",city:body.city||"",state:body.state||"",zip:body.zip||"",country:body.country||"",addressType:body.addressType||"",phone:body.phone||"",fax:body.fax||""})
  const colorMap=createDefaultColorMap()
  await colorRepo.create({
    id:createId(),
    companyId:id,
    colorList:colorListFromMap(colorMap),
    colorMapJson:JSON.stringify(colorMap)
  })
  return id
}
const updateCompany=(id,body)=>companyRepo.update(id,{name:body.name||"",abbr:body.abbr||"",contact:body.contact||"",street:body.street||"",city:body.city||"",state:body.state||"",zip:body.zip||"",country:body.country||"",addressType:body.addressType||"",phone:body.phone||"",fax:body.fax||""})
const deleteCompany=(id)=>companyRepo.destroy(id)

const listUsers=()=>userRepo.findAll()
const createUser=async(body)=>{
  const id=body.id
  const hash=await bcrypt.hash(body.password||"",10)
  await userRepo.create({id,companyId:body.companyId||"",role:body.role||"User",customerName:body.customerName||"",email:body.email||"",phone:body.phone||"",passwordHash:hash})
  return id
}
const updateUser=async(id,body)=>{
  const data={companyId:body.companyId||"",role:body.role||"User",customerName:body.customerName||"",email:body.email||"",phone:body.phone||""}
  if(body.password&&String(body.password).trim()){
    data.passwordHash=await bcrypt.hash(String(body.password),10)
  }
  return userRepo.update(id,data)
}
const deleteUser=(id)=>userRepo.destroy(id)

const listProfiles=async(where)=>sortProfiles(await profileRepo.findAll(where))
const createProfile=(body)=>profileRepo.create({
  id:body.id,
  material:body.material||"",
  category:body.category||"",
  name:body.name||"",
  imageUrl:body.imageUrl||"",
  data:body.data||"",
  createdAt:body.createdAt||new Date().toISOString(),
  kdCode:body.kdCode||"",
  customerCode:body.customerCode||""
})
const updateProfile=(id,body)=>profileRepo.update(id,{
  material:body.material||"",
  category:body.category||"",
  name:body.name||"",
  imageUrl:body.imageUrl||"",
  data:body.data||"",
  kdCode:body.kdCode||"",
  customerCode:body.customerCode||""
})
const deleteProfile=(id)=>profileRepo.destroy(id)

const listColors=(where)=>colorRepo.findAll(where)
const normalizeLouverOpening=(value)=>{
  const raw=String(value||"").trim().toLowerCase()
  if(raw==="none")return "None"
  if(raw==="1way")return "1way"
  if(raw==="2way")return "2way"
  return "Both"
}
const normalizeColorMap=(value)=>{
  const map=value&&typeof value==="object"?value:{}
  const normalizeList=(raw)=>{
    if(Array.isArray(raw))return raw.map(v=>String(v||"").trim()).filter(Boolean)
    return String(raw||"").split(/[\/,]/).map(v=>v.trim()).filter(Boolean)
  }
  const normalizePair=(pair)=>{
    const source=pair&&typeof pair==="object"?pair:{}
    return {
      shutter:normalizeList(source.shutter),
      hinge:normalizeList(source.hinge),
      tilt:normalizeList(source.tilt),
      louverOpening:normalizeLouverOpening(source.louverOpening)
    }
  }
  const byProductSource=map.byProduct&&typeof map.byProduct==="object"?map.byProduct:{}
  const byProduct={}
  Object.keys(byProductSource).forEach(code=>{
    if(!code)return
    byProduct[code]=normalizePair(byProductSource[code])
  })
  const defaultPair=normalizePair(map.default)
  return {default:defaultPair,byProduct}
}
const serializeColorPair=(pair)=>{
  const source=pair&&typeof pair==="object"?pair:{}
  const shutter=(Array.isArray(source.shutter)?source.shutter:[]).join("/")
  const hinge=(Array.isArray(source.hinge)?source.hinge:[]).join("/")
  return {shutter,hinge}
}
const colorListFromMap=(map)=>{
  const pair=serializeColorPair(map&&map.default?map.default:{})
  return `shutter:${pair.shutter}|hinge:${pair.hinge}`
}
const createColor=(body)=>{
  const map=normalizeColorMap(body.colorMap)
  return colorRepo.create({
    id:body.id,
    companyId:body.companyId||"",
    colorList:body.colorList||colorListFromMap(map),
    colorMapJson:JSON.stringify(map)
  })
}
const updateColor=(id,body)=>{
  const map=normalizeColorMap(body.colorMap)
  return colorRepo.update(id,{
    companyId:body.companyId||"",
    colorList:body.colorList||colorListFromMap(map),
    colorMapJson:JSON.stringify(map)
  })
}
const deleteColor=(id)=>colorRepo.destroy(id)

const getExcelExport=()=>excelExportRepo.findOne()
const upsertExcelExport=async(body)=>{
  const row=await excelExportRepo.findOne()
  if(row){
    await excelExportRepo.update(row.id,{name:body.name||"",templateFileId:body.templateFileId||"",ruleJson:body.ruleJson||""})
    return row.id
  }
  const id=body.id
  await excelExportRepo.create({id,name:body.name||"",templateFileId:body.templateFileId||"",ruleJson:body.ruleJson||""})
  return id
}

module.exports={listCompanies,createCompany,updateCompany,deleteCompany,listUsers,createUser,updateUser,deleteUser,listProfiles,createProfile,updateProfile,deleteProfile,listColors,createColor,updateColor,deleteColor,getExcelExport,upsertExcelExport}
