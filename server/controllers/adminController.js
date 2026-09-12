const {initDb}=require("../db")
const {createId}=require("../utils")
const {companySchema,userCreateSchema,userUpdateSchema,profileSchema,colorSchema,companyConfigSchema,excelExportSchema}=require("../dto/schemas")
const {validate}=require("../dto/validate")
const adminService=require("../services/adminService")
const companyConfigService=require("../services/companyConfigService")

const getCompanies=async(req,res)=>{
  await initDb()
  const rows=await adminService.listCompanies()
  res.json(rows)
}
const createCompany=async(req,res)=>{
  await initDb()
  const parsed=validate(companySchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const id=createId()
  await adminService.createCompany({...parsed.data,id})
  res.json({id})
}
const updateCompany=async(req,res)=>{
  await initDb()
  const parsed=validate(companySchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.updateCompany(req.params.id,parsed.data)
  res.json({id:req.params.id})
}
const deleteCompany=async(req,res)=>{
  await initDb()
  await adminService.deleteCompany(req.params.id)
  res.json({success:"true"})
}

const getUsers=async(req,res)=>{
  await initDb()
  const rows=await adminService.listUsers()
  res.json(rows)
}
const createUser=async(req,res)=>{
  await initDb()
  const id=createId()
  const parsed=validate(userCreateSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.createUser({...parsed.data,id})
  res.json({id})
}
const updateUser=async(req,res)=>{
  await initDb()
  const parsed=validate(userUpdateSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.updateUser(req.params.id,parsed.data)
  res.json({id:req.params.id})
}
const deleteUser=async(req,res)=>{
  await initDb()
  await adminService.deleteUser(req.params.id)
  res.json({success:"true"})
}

const getProfiles=async(req,res)=>{
  await initDb()
  const {material,category}=req.query
  const where={}
  if(material)where.material=material
  if(category)where.category=category
  const rows=await adminService.listProfiles(where)
  res.json(rows)
}
const createProfile=async(req,res)=>{
  await initDb()
  const id=createId()
  const parsed=validate(profileSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.createProfile({...parsed.data,id})
  res.json({id})
}
const updateProfile=async(req,res)=>{
  await initDb()
  const parsed=validate(profileSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.updateProfile(req.params.id,parsed.data)
  res.json({id:req.params.id})
}
const deleteProfile=async(req,res)=>{
  await initDb()
  await adminService.deleteProfile(req.params.id)
  res.json({success:"true"})
}

const getColors=async(req,res)=>{
  await initDb()
  const {companyId}=req.query
  const where=companyId?{companyId}:{}
  const rows=await adminService.listColors(where)
  res.json(rows)
}
const createColor=async(req,res)=>{
  await initDb()
  const id=createId()
  const parsed=validate(colorSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.createColor({...parsed.data,id})
  res.json({id})
}
const updateColor=async(req,res)=>{
  await initDb()
  const parsed=validate(colorSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  await adminService.updateColor(req.params.id,parsed.data)
  res.json({id:req.params.id})
}
const deleteColor=async(req,res)=>{
  await initDb()
  await adminService.deleteColor(req.params.id)
  res.json({success:"true"})
}

const getCompanyConfig=async(req,res)=>{
  await initDb()
  const {companyId}=req.query
  if(!companyId)return res.json(null)
  const row=await companyConfigService.getCompanyConfig(companyId)
  res.json(row||null)
}
const upsertCompanyConfig=async(req,res)=>{
  await initDb()
  const companyId=req.params.companyId
  const parsed=validate(companyConfigSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const resultId=await companyConfigService.upsertCompanyConfig(companyId,parsed.data)
  res.json({companyId:resultId})
}

const getExcelExport=async(req,res)=>{
  await initDb()
  const row=await adminService.getExcelExport()
  res.json(row||null)
}
const upsertExcelExport=async(req,res)=>{
  await initDb()
  const id=createId()
  const parsed=validate(excelExportSchema,req.body||{})
  if(!parsed.ok)return res.status(400).json({error:"invalid_request",issues:parsed.issues})
  const resultId=await adminService.upsertExcelExport({...parsed.data,id})
  res.json({id:resultId})
}

module.exports={getCompanies,createCompany,updateCompany,deleteCompany,getUsers,createUser,updateUser,deleteUser,getProfiles,createProfile,updateProfile,deleteProfile,getColors,createColor,updateColor,deleteColor,getCompanyConfig,upsertCompanyConfig,getExcelExport,upsertExcelExport}
