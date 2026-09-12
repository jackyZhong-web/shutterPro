const path=require("path")
const fs=require("fs")
const multer=require("multer")
const fileRepo=require("../repositories/fileRepo")
const {createId}=require("../utils")

const uploadDir=path.join(__dirname,"..","uploads")
const userUploadDir=path.join(uploadDir,"userupload")
if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true})
if(!fs.existsSync(userUploadDir))fs.mkdirSync(userUploadDir,{recursive:true})
const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>{
    const id=createId()
    const ext=path.extname(file.originalname||"")
    cb(null,`${id}${ext}`)
  }
})
const uploader=multer({storage,limits:{fileSize:10*1024*1024}})
const storageUser=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,userUploadDir),
  filename:(req,file,cb)=>{
    const id=createId()
    const ext=path.extname(file.originalname||"")
    cb(null,`${id}${ext}`)
  }
})
const uploaderUser=multer({storage:storageUser,limits:{fileSize:20*1024*1024}})

const saveFile=async(file,body,userRole)=>{
  if(!file)throw new Error("file_required")
  const id=createId()
  const fileName=file.originalname||""
  const filePath=file.path
  const fileType=(body||{}).type||""
  if(fileType==="excelTemplate"&&userRole!=="Admin")throw new Error("forbidden")
  await fileRepo.create({id,fileName,filePath,fileType})
  return {id,fileName,filePath,fileType}
}

const getFile=async(id)=>fileRepo.findOne(id)
const consumeExportFile=async(id)=>{
  const row=await fileRepo.findOne(id)
  if(!row)return false
  if(row.fileType!=="export")return false
  await fileRepo.destroy(id)
  if(row.filePath&&fs.existsSync(row.filePath)){
    try{fs.unlinkSync(row.filePath)}catch(e){}
  }
  return true
}

const saveUserFile=async(file)=>{
  if(!file)throw new Error("file_required")
  const id=createId()
  const fileName=file.originalname||""
  const filePath=file.path
  const fileType="userupload"
  await fileRepo.create({id,fileName,filePath,fileType})
  return {id,fileName,filePath,fileType}
}

module.exports={uploader,uploaderUser,saveFile,saveUserFile,getFile,consumeExportFile}
