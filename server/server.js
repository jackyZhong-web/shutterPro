require("dotenv").config()
const express=require("express")
const path=require("path")
const fs=require("fs")
const crypto=require("crypto")
const helmet=require("helmet")
const rateLimit=require("express-rate-limit")
const cors=require("cors")
const {authMiddleware,adminOnly}=require("./middleware")
const {initDb}=require("./db")
const authRoutes=require("./routes/auth")
const adminRoutes=require("./routes/admin")
const catalogRoutes=require("./routes/catalog")
const cartRoutes=require("./routes/cart")
const companyRoutes=require("./routes/company")
const ordersRoutes=require("./routes/orders")
const filesRoutes=require("./routes/files")
const remakesRoutes=require("./routes/remakes")

const app=express()
const PORT=process.env.PORT||3000
const logsDir=path.join(__dirname,"logs")
if(!fs.existsSync(logsDir))fs.mkdirSync(logsDir,{recursive:true})
const ALERT_WEBHOOK=process.env.ALERT_WEBHOOK||""
const dateKey=(date)=>{
  const pad=n=>String(n).padStart(2,"0")
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}
let currentLogDate=""
let currentLogStream=null
const getLogStream=()=>{
  const today=dateKey(new Date())
  if(currentLogDate!==today){
    if(currentLogStream){
      try{currentLogStream.end()}catch(e){}
    }
    currentLogDate=today
    currentLogStream=fs.createWriteStream(path.join(logsDir,`server-${today}.log`),{flags:"a"})
  }
  return currentLogStream
}
const writeLog=(entry)=>{
  try{
    const stream=getLogStream()
    stream.write(`${JSON.stringify(entry)}\n`)
  }catch(e){}
}
const sendAlert=(entry)=>{
  if(!ALERT_WEBHOOK||typeof fetch!=="function")return
  fetch(ALERT_WEBHOOK,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(entry)
  }).catch(()=>{})
}
const writeMethods=new Set(["POST","PUT","PATCH","DELETE"])
const isFilesRequest=req=>req.path.startsWith("/files")
const shouldSkipLimit=req=>req.method==="OPTIONS"||isFilesRequest(req)
const keyFromRequest=req=>{
  const header=req.headers.authorization||""
  if(header.startsWith("Bearer "))return header.slice(7)
  return req.ip
}

app.disable("x-powered-by")
app.use(helmet())
app.use((req,res,next)=>{
  const traceHeader=typeof req.headers["x-trace-id"]==="string"?req.headers["x-trace-id"]:""
  const requestHeader=typeof req.headers["x-request-id"]==="string"?req.headers["x-request-id"]:""
  req.traceId=traceHeader||crypto.randomUUID()
  req.requestId=requestHeader||req.traceId||crypto.randomUUID()
  res.setHeader("x-trace-id",req.traceId)
  res.setHeader("x-request-id",req.requestId)
  next()
})
app.use((req,res,next)=>{
  const start=Date.now()
  res.on("finish",()=>{
    const ms=Date.now()-start
    const userId=req.user&&req.user.id?req.user.id:""
    const tenantId=req.user&&req.user.companyId?req.user.companyId:""
    const statusCode=res.statusCode
    const level=statusCode>=500?"error":statusCode>=400?"warn":"info"
    const entry={
      timestamp:new Date().toISOString(),
      level,
      event:"http_request",
      traceId:req.traceId||"",
      requestId:req.requestId||"",
      tenantId,
      userId,
      method:req.method,
      path:req.originalUrl,
      statusCode,
      durationMs:ms,
      ip:req.ip,
      userAgent:req.headers["user-agent"]||""
    }
    writeLog(entry)
    if(statusCode>=500){
      const alertEntry={...entry,event:"http_5xx_alert"}
      sendAlert(alertEntry)
      console.error(JSON.stringify(alertEntry))
    }
  })
  next()
})
const corsOrigin=process.env.CORS_ORIGIN||""
app.use(cors({origin:corsOrigin?corsOrigin.split(","):true}))
app.use(rateLimit({
  windowMs:15*60*1000,
  max:2000,
  standardHeaders:true,
  legacyHeaders:false,
  skip:req=>shouldSkipLimit(req)||writeMethods.has(req.method),
  keyGenerator:keyFromRequest
}))
app.use(rateLimit({
  windowMs:15*60*1000,
  max:300,
  standardHeaders:true,
  legacyHeaders:false,
  skip:req=>shouldSkipLimit(req)||!writeMethods.has(req.method),
  keyGenerator:keyFromRequest
}))
app.use(express.json({limit:"2mb"}))
app.use(express.urlencoded({extended:false}))

if(process.env.SERVE_STATIC==="true"){
  app.use(express.static(path.join(__dirname,"..","client","public"),{maxAge:"7d",etag:true}))
}

app.use("/auth",authRoutes)
app.use(authMiddleware)
app.use(catalogRoutes)
app.use("/files",filesRoutes)
app.use(companyRoutes)
app.use(cartRoutes)
app.use(ordersRoutes)
app.use(remakesRoutes)
app.use(adminOnly,adminRoutes)

initDb().catch(e=>{console.error("db_init_failed",e)})
process.on("unhandledRejection",(reason)=>{
  const entry={
    timestamp:new Date().toISOString(),
    level:"error",
    event:"unhandled_rejection",
    traceId:"",
    requestId:"",
    tenantId:"",
    userId:"",
    detail:String(reason&&reason.stack?reason.stack:reason)
  }
  writeLog(entry)
  sendAlert(entry)
  console.error(JSON.stringify(entry))
})
process.on("uncaughtException",(error)=>{
  const entry={
    timestamp:new Date().toISOString(),
    level:"fatal",
    event:"uncaught_exception",
    traceId:"",
    requestId:"",
    tenantId:"",
    userId:"",
    detail:String(error&&error.stack?error.stack:error)
  }
  writeLog(entry)
  sendAlert(entry)
  console.error(JSON.stringify(entry))
})
app.listen(PORT,()=>{})
