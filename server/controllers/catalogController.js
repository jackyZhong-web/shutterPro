const {initDb}=require("../db")
const catalogService=require("../services/catalogService")
const {MATERIAL_OPTIONS}=require("../config/materials")

const getProfiles=async(req,res)=>{
  await initDb()
  const {material,category}=req.query
  const where={}
  if(material)where.material=material
  if(category)where.category=category
  const rows=await catalogService.listProfiles(where)
  res.json(rows)
}

const getColors=async(req,res)=>{
  await initDb()
  const {companyId}=req.query
  const where=companyId?{companyId}:{}
  const rows=await catalogService.listColors(where)
  res.json(rows)
}

const getMaterials=async(req,res)=>{
  await initDb()
  res.json(MATERIAL_OPTIONS.map(item=>({code:item.code,label:item.label})))
}

module.exports={getProfiles,getColors,getMaterials}
