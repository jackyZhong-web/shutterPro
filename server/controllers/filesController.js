const {initDb}=require("../db")
const filesService=require("../services/filesService")

const uploadFile=async(req,res)=>{
  try{
    await initDb()
    const result=await filesService.saveFile(req.file,req.body,req.user.role)
    res.json(result)
  }catch(e){
    if(e.message==="file_required")return res.status(400).json({error:"file_required"})
    if(e.message==="forbidden")return res.status(403).json({error:"forbidden"})
    res.status(500).json({error:"server_error"})
  }
}

const getFile=async(req,res)=>{
  await initDb()
  const row=await filesService.getFile(req.params.id)
  if(!row)return res.status(404).json({error:"not_found"})
  res.setHeader("Cache-Control","public, max-age=604800")
  const consume=String(req.query.consume||"")==="1"&&row.fileType==="export"
  res.sendFile(row.filePath,async(err)=>{
    if(err)return
    if(!consume)return
    try{
      await filesService.consumeExportFile(row.id)
    }catch(e){}
  })
}

const uploadUserFile=async(req,res)=>{
  try{
    await initDb()
    const result=await filesService.saveUserFile(req.file)
    res.json(result)
  }catch(e){
    if(e.message==="file_required")return res.status(400).json({error:"file_required"})
    res.status(500).json({error:"server_error"})
  }
}

module.exports={uploadFile,getFile,uploadUserFile}
