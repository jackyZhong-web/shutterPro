const {Sequelize}=require("sequelize")
const mysql=require("mysql2/promise")
const bcrypt=require("bcryptjs")
const {MATERIAL_CODES}=require("./config/materials")

const DB_CONFIG={
  host:process.env.DB_HOST||"localhost",
  user:process.env.DB_USER||"root",
  password:process.env.DB_PASSWORD||"123456",
  database:process.env.DB_NAME||"shutterpro",
  port:process.env.DB_PORT?Number(process.env.DB_PORT):3306
}

const sequelize=new Sequelize(DB_CONFIG.database,DB_CONFIG.user,DB_CONFIG.password,{
  host:DB_CONFIG.host,
  port:DB_CONFIG.port,
  dialect:"mysql",
  logging:false
})

let dbReady=false
let dbHasTables=false
const ensureDatabase=async()=>{
  const conn=await mysql.createConnection({host:DB_CONFIG.host,user:DB_CONFIG.user,password:DB_CONFIG.password,port:DB_CONFIG.port})
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  const [rows]=await conn.query(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?",
    [DB_CONFIG.database]
  )
  dbHasTables=Number(rows?.[0]?.count||0)>0
  await conn.end()
}
const seedData=async()=>{
  const {Company,User,Profile,Color,CompanyConfig}=require("./models")
  const company=await Company.findByPk("c-001")
  if(!company){
    await Company.create({id:"c-001",name:"Best Blinds Co.",abbr:"BB",contact:"John Doe",street:"Street 1",city:"Shanghai",state:"",zip:"200000",country:"China",addressType:"",phone:"123",fax:""})
  }
  const admin=await User.findByPk("u-001")
  if(!admin){
    const hash=await bcrypt.hash("123456",10)
    await User.create({id:"u-001",companyId:"c-001",role:"Admin",customerName:"John Doe",email:"admin@system.com",phone:"",passwordHash:hash})
  }
  const user=await User.findByPk("u-002")
  if(!user){
    const hash=await bcrypt.hash("123456",10)
    await User.create({id:"u-002",companyId:"c-001",role:"User",customerName:"Alice",email:"alice@test.com",phone:"",passwordHash:hash})
  }
  const profile=await Profile.findByPk("p-001")
  if(!profile){
    await Profile.create({id:"p-001",material:"Hollow",category:"Stile",name:"50mm Beaded",imageUrl:"file-001",data:"20mm"})
  }
  const color=await Color.findByPk("color-001")
  if(!color){
    await Color.create({id:"color-001",companyId:"c-001",colorList:"White/Black/Gray"})
  }
  const config=await CompanyConfig.findByPk("c-001")
  if(!config){
    const productList=[...MATERIAL_CODES]
    const styleList=["Full Height","Tier on Tier","Café style","Bi-Fold Track","Bypass Track","Shape"]
    const profileIds=["p-001"]
    await CompanyConfig.create({
      companyId:"c-001",
      productList:JSON.stringify(productList),
      styleList:JSON.stringify(styleList),
      profileIds:JSON.stringify(profileIds)
    })
  }
}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const isDeadlock=(err)=>{
  const code=err?.original?.code||err?.parent?.code||err?.code||""
  return code==="ER_LOCK_DEADLOCK"
}
const shouldAlter=()=>process.env.DB_ALTER==="true"
const ensureCompatColumns=async()=>{
  const queryInterface=sequelize.getQueryInterface()
  const ensureColumn=async(tableName,columnName,columnDef)=>{
    try{
      const columns=await queryInterface.describeTable(tableName)
      if(columns&&columns[columnName])return
      await queryInterface.addColumn(tableName,columnName,columnDef)
    }catch(e){
      const code=e?.original?.code||e?.parent?.code||e?.code||""
      if(code!=="ER_NO_SUCH_TABLE")throw e
    }
  }
  try{
    await ensureColumn("order_lines","drawingUploadFileId",{type:Sequelize.STRING(36),allowNull:true})
    await ensureColumn("cart_lines","drawingUploadFileId",{type:Sequelize.STRING(36),allowNull:true})
    await ensureColumn("order_lines","tpost",{type:Sequelize.STRING(64),allowNull:true})
    await ensureColumn("cart_lines","tpost",{type:Sequelize.STRING(64),allowNull:true})
    for(let i=1;i<=6;i+=1){
      await ensureColumn("order_lines",`angle${i}`,{type:Sequelize.STRING(64),allowNull:true})
      await ensureColumn("cart_lines",`angle${i}`,{type:Sequelize.STRING(64),allowNull:true})
    }
    await ensureColumn("orders","po",{type:Sequelize.STRING(50),allowNull:true})
    await ensureColumn("orders","sideMark",{type:Sequelize.STRING(50),allowNull:true})
    await ensureColumn("colors","colorMapJson",{type:Sequelize.STRING(4000),allowNull:true})
    await ensureColumn("company_configs","tiltOptionList",{type:Sequelize.STRING(1000),allowNull:true})
    await ensureColumn("company_configs","profileMountMap",{type:Sequelize.STRING(2000),allowNull:true})
    await ensureColumn("company_configs","profileAreaMountMap",{type:Sequelize.STRING(2000),allowNull:true})
    await ensureColumn("profiles","kdCode",{type:Sequelize.STRING(255),allowNull:true})
    await ensureColumn("profiles","customerCode",{type:Sequelize.STRING(255),allowNull:true})
    await ensureColumn("profiles","createdAt",{type:Sequelize.STRING(64),allowNull:true})
  }catch(e){
    console.error("[db] ensureCompatColumns failed",e)
    throw e
  }
}
const initDb=async(models)=>{
  if(dbReady)return
  await ensureDatabase()
  await sequelize.authenticate()
  require("./models")
  let attempts=0
  while(true){
    try{
  await sequelize.sync({alter:shouldAlter()||!dbHasTables})
      await ensureCompatColumns()
      break
    }catch(e){
      attempts+=1
      if(!isDeadlock(e)||attempts>3)throw e
      await sleep(500*attempts)
    }
  }
  await seedData()
  dbReady=true
  return models
}

module.exports={sequelize,initDb}
