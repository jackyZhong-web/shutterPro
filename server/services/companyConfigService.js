const companyConfigRepo=require("../repositories/companyConfigRepo")
const {safeJsonParse}=require("../utils")
const AVAILABLE_MOUNTS=["IM","OM","N.W.F"]
const AREA_RULES=["add","subtract"]

const parseList=(value)=>{
  const parsed=safeJsonParse(value)
  return Array.isArray(parsed)?parsed:[]
}
const serializeList=(value)=>JSON.stringify(Array.isArray(value)?value:[])
const parseMountMap=(value)=>{
  const parsed=safeJsonParse(value)
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {}
  const result={}
  Object.keys(parsed).forEach(key=>{
    const list=Array.isArray(parsed[key])?parsed[key]:[]
    const normalized=list.map(v=>String(v||"").trim().toUpperCase()).filter(v=>AVAILABLE_MOUNTS.includes(v))
    result[key]=Array.from(new Set(normalized))
  })
  return result
}
const serializeMountMap=(value)=>{
  if(!value||typeof value!=="object"||Array.isArray(value))return "{}"
  const normalized={}
  Object.keys(value).forEach(key=>{
    const list=Array.isArray(value[key])?value[key]:[]
    const mounts=list.map(v=>String(v||"").trim().toUpperCase()).filter(v=>AVAILABLE_MOUNTS.includes(v))
    normalized[key]=Array.from(new Set(mounts))
  })
  return JSON.stringify(normalized)
}
const normalizeAreaRule=(value)=>{
  const raw=String(value||"").trim().toLowerCase()
  return AREA_RULES.includes(raw)?raw:""
}
const parseAreaMountMap=(value)=>{
  const parsed=safeJsonParse(value)
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {}
  const result={}
  Object.keys(parsed).forEach(key=>{
    const current=parsed[key]
    if(Array.isArray(current)){
      const normalized=current.map(v=>String(v||"").trim().toUpperCase()).filter(v=>AVAILABLE_MOUNTS.includes(v))
      if(normalized.length){
        result[key]={}
        normalized.forEach(mount=>{
          result[key][mount]="add"
        })
      }
      return
    }
    if(!current||typeof current!=="object")return
    const next={}
    Object.keys(current).forEach(mountKey=>{
      const mount=String(mountKey||"").trim().toUpperCase()
      if(!AVAILABLE_MOUNTS.includes(mount))return
      const rule=normalizeAreaRule(current[mountKey])
      if(rule)next[mount]=rule
    })
    if(Object.keys(next).length)result[key]=next
  })
  return result
}
const serializeAreaMountMap=(value)=>{
  if(!value||typeof value!=="object"||Array.isArray(value))return "{}"
  const normalized={}
  Object.keys(value).forEach(key=>{
    const current=value[key]
    if(!current||typeof current!=="object"||Array.isArray(current))return
    const next={}
    Object.keys(current).forEach(mountKey=>{
      const mount=String(mountKey||"").trim().toUpperCase()
      if(!AVAILABLE_MOUNTS.includes(mount))return
      const rule=normalizeAreaRule(current[mountKey])
      if(rule)next[mount]=rule
    })
    normalized[key]=next
  })
  return JSON.stringify(normalized)
}

const getCompanyConfig=async(companyId)=>{
  if(!companyId)return null
  const row=await companyConfigRepo.findOne(companyId)
  if(!row)return null
  return {
    companyId:row.companyId,
    productList:parseList(row.productList),
    styleList:parseList(row.styleList),
    profileIds:parseList(row.profileIds),
    tiltOptionList:[],
    profileMountMap:parseMountMap(row.profileMountMap),
    profileAreaMountMap:parseAreaMountMap(row.profileAreaMountMap)
  }
}

const upsertCompanyConfig=async(companyId,body)=>{
  const payload={
    companyId,
    productList:serializeList(body.productList),
    styleList:serializeList(body.styleList),
    profileIds:serializeList(body.profileIds),
    profileMountMap:serializeMountMap(body.profileMountMap),
    profileAreaMountMap:serializeAreaMountMap(body.profileAreaMountMap)
  }
  const row=await companyConfigRepo.findOne(companyId)
  if(row){
    await companyConfigRepo.update(companyId,payload)
    return companyId
  }
  await companyConfigRepo.create(payload)
  return companyId
}

module.exports={getCompanyConfig,upsertCompanyConfig}
