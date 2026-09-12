const {z}=require("zod")

const loginSchema=z.object({
  loginName:z.string().min(1),
  password:z.string().min(1)
})

const changePasswordSchema=z.object({
  currentPassword:z.string().min(1),
  newPassword:z.string().min(1)
})

const companySchema=z.object({
  name:z.string().optional().default(""),
  abbr:z.string().optional().default(""),
  contact:z.string().optional().default(""),
  street:z.string().optional().default(""),
  city:z.string().optional().default(""),
  state:z.string().optional().default(""),
  zip:z.string().optional().default(""),
  country:z.string().optional().default(""),
  addressType:z.string().optional().default(""),
  phone:z.string().optional().default(""),
  fax:z.string().optional().default("")
})

const userCreateSchema=z.object({
  companyId:z.string().optional().default(""),
  role:z.string().optional().default("User"),
  customerName:z.string().optional().default(""),
  email:z.string().optional().default(""),
  phone:z.string().optional().default(""),
  password:z.string().min(1)
})

const userUpdateSchema=z.object({
  companyId:z.string().optional().default(""),
  role:z.string().optional().default("User"),
  customerName:z.string().optional().default(""),
  email:z.string().optional().default(""),
  phone:z.string().optional().default(""),
  password:z.string().optional().default("")
})

const profileSchema=z.object({
  material:z.string().optional().default(""),
  category:z.string().optional().default(""),
  name:z.string().optional().default(""),
  imageUrl:z.string().optional().default(""),
  data:z.string().optional().default(""),
  kdCode:z.string().optional().default(""),
  customerCode:z.string().optional().default("")
})

const colorSchema=z.object({
  companyId:z.string().optional().default(""),
  colorList:z.string().optional().default(""),
  colorMap:z.any().optional()
})

const companyConfigSchema=z.object({
  productList:z.array(z.string()).optional().default([]),
  styleList:z.array(z.string()).optional().default([]),
  profileIds:z.array(z.string()).optional().default([]),
  tiltOptionList:z.array(z.string()).optional().default([]),
  profileMountMap:z.record(z.array(z.string())).optional().default({}),
  profileAreaMountMap:z.any().optional().default({})
})

const excelExportSchema=z.object({
  name:z.string().optional().default(""),
  templateFileId:z.string().optional().default(""),
  ruleJson:z.string().optional().default("")
})

const lineSchema=z.object({
  room:z.string().optional().default(""),
  product:z.string().optional().default(""),
  style:z.string().optional().default(""),
  width:z.string().optional().default(""),
  height:z.string().optional().default(""),
  panelConfig:z.string().optional().default(""),
  sqm:z.string().optional().default(""),
  mount:z.string().optional().default(""),
  criticalMidRail:z.string().optional().default(""),
  horizontalTpost:z.string().optional().default(""),
  tiltOption:z.string().optional().default(""),
  midRail1:z.string().optional().default(""),
  midRail2:z.string().optional().default(""),
  split1:z.string().optional().default(""),
  split2:z.string().optional().default(""),
  tierOnTier1:z.string().optional().default(""),
  tierOnTier2:z.string().optional().default(""),
  firstPanelOpening:z.string().optional().default(""),
  postPosition1:z.string().optional().default(""),
  postPosition2:z.string().optional().default(""),
  postPosition3:z.string().optional().default(""),
  postPosition4:z.string().optional().default(""),
  postPosition5:z.string().optional().default(""),
  postPosition6:z.string().optional().default(""),
  angle1:z.string().optional().default(""),
  angle2:z.string().optional().default(""),
  angle3:z.string().optional().default(""),
  angle4:z.string().optional().default(""),
  angle5:z.string().optional().default(""),
  angle6:z.string().optional().default(""),
  louvresOpening:z.string().optional().default(""),
  louvresSize:z.string().optional().default(""),
  stile:z.string().optional().default(""),
  tpost:z.string().optional().default(""),
  frameType:z.string().optional().default(""),
  frameSideLeft:z.string().optional().default(""),
  frameSideRight:z.string().optional().default(""),
  frameSideTop:z.string().optional().default(""),
  frameSideBottom:z.string().optional().default(""),
  cilplatesLeft:z.string().optional().default(""),
  cilplatesRight:z.string().optional().default(""),
  cilplatesTop:z.string().optional().default(""),
  cilplatesBottom:z.string().optional().default(""),
  buildUpLeft:z.string().optional().default(""),
  buildUpRight:z.string().optional().default(""),
  buildUpTop:z.string().optional().default(""),
  buildUpBottom:z.string().optional().default(""),
  battensWidth:z.string().optional().default(""),
  battensDepth:z.string().optional().default(""),
  battensHeight:z.string().optional().default(""),
  shutterColor:z.string().optional().default(""),
  hingeColor:z.string().optional().default(""),
  notes:z.string().optional().default(""),
  slidingOption:z.string().optional().default(""),
  trackOption:z.string().optional().default(""),
  shapeType:z.string().optional().default(""),
  drawingUpload:z.string().optional().default(""),
  drawingUploadFileId:z.string().optional().default("")
})

const orderUpdateSchema=z.object({
  orderReference:z.string().optional().default(""),
  po:z.string().max(50).optional().default(""),
  sideMark:z.string().max(50).optional().default(""),
  lines:z.array(lineSchema).optional().default([])
})

const orderMetaSchema=z.object({
  orderReference:z.string().optional().default(""),
  po:z.string().max(50).optional().default(""),
  sideMark:z.string().max(50).optional().default("")
})

const remakeCreateSchema=z.object({
  orderId:z.string().optional().default(""),
  lineId:z.string().optional().default(""),
  types:z.array(z.string()).optional().default([]),
  note:z.string().optional().default(""),
  fileId:z.string().optional().default("")
})

const remakeRefuseSchema=z.object({
  comment:z.string().optional().default("")
})

module.exports={loginSchema,changePasswordSchema,companySchema,userCreateSchema,userUpdateSchema,profileSchema,colorSchema,companyConfigSchema,excelExportSchema,lineSchema,orderUpdateSchema,orderMetaSchema,remakeCreateSchema,remakeRefuseSchema}
