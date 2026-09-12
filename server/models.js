const {DataTypes}=require("sequelize")
const {sequelize}=require("./db")

const Company=sequelize.define("Company",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  name:{type:DataTypes.STRING(255)},
  abbr:{type:DataTypes.STRING(64)},
  contact:{type:DataTypes.STRING(255)},
  street:{type:DataTypes.STRING(255)},
  city:{type:DataTypes.STRING(255)},
  state:{type:DataTypes.STRING(255)},
  zip:{type:DataTypes.STRING(64)},
  country:{type:DataTypes.STRING(255)},
  addressType:{type:DataTypes.STRING(255)},
  phone:{type:DataTypes.STRING(64)},
  fax:{type:DataTypes.STRING(64)}
},{tableName:"companies",timestamps:false})

const User=sequelize.define("User",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  companyId:{type:DataTypes.STRING(36)},
  role:{type:DataTypes.STRING(32)},
  customerName:{type:DataTypes.STRING(255)},
  email:{type:DataTypes.STRING(255)},
  phone:{type:DataTypes.STRING(64)},
  passwordHash:{type:DataTypes.STRING(255)}
},{tableName:"users",timestamps:false})

const Profile=sequelize.define("Profile",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  material:{type:DataTypes.STRING(64)},
  category:{type:DataTypes.STRING(64)},
  name:{type:DataTypes.STRING(255)},
  imageUrl:{type:DataTypes.STRING(255)},
  data:{type:DataTypes.STRING(255)},
  createdAt:{type:DataTypes.STRING(64)},
  kdCode:{type:DataTypes.STRING(255)},
  customerCode:{type:DataTypes.STRING(255)}
},{tableName:"profiles",timestamps:false})

const Color=sequelize.define("Color",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  companyId:{type:DataTypes.STRING(36)},
  colorList:{type:DataTypes.STRING(1024)},
  colorMapJson:{type:DataTypes.STRING(4000)}
},{tableName:"colors",timestamps:false})

const CompanyConfig=sequelize.define("CompanyConfig",{
  companyId:{type:DataTypes.STRING(36),primaryKey:true},
  productList:{type:DataTypes.STRING(2000)},
  styleList:{type:DataTypes.STRING(2000)},
  profileIds:{type:DataTypes.STRING(4000)},
  tiltOptionList:{type:DataTypes.STRING(1000)},
  profileMountMap:{type:DataTypes.STRING(2000)},
  profileAreaMountMap:{type:DataTypes.STRING(2000)}
},{tableName:"company_configs",timestamps:false})

const ExcelExport=sequelize.define("ExcelExport",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  name:{type:DataTypes.STRING(255)},
  templateFileId:{type:DataTypes.STRING(36)},
  ruleJson:{type:DataTypes.STRING(4000)}
},{tableName:"excel_exports",timestamps:false})

const File=sequelize.define("File",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  fileName:{type:DataTypes.STRING(255)},
  filePath:{type:DataTypes.STRING(255)},
  fileType:{type:DataTypes.STRING(64)}
},{tableName:"files",timestamps:false})

const Order=sequelize.define("Order",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  orderNo:{type:DataTypes.STRING(64)},
  companyId:{type:DataTypes.STRING(36)},
  userId:{type:DataTypes.STRING(36)},
  orderReference:{type:DataTypes.STRING(255)},
  po:{type:DataTypes.STRING(50)},
  sideMark:{type:DataTypes.STRING(50)},
  date:{type:DataTypes.STRING(32)},
  status:{type:DataTypes.STRING(32)},
  sqmTotal:{type:DataTypes.STRING(64)},
  mark:{type:DataTypes.STRING(1024)}
},{tableName:"orders",timestamps:false})

const OrderLine=sequelize.define("OrderLine",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  orderId:{type:DataTypes.STRING(36)},
  room:{type:DataTypes.STRING(255)},
  product:{type:DataTypes.STRING(64)},
  style:{type:DataTypes.STRING(64)},
  width:{type:DataTypes.STRING(64)},
  height:{type:DataTypes.STRING(64)},
  panelConfig:{type:DataTypes.STRING(64)},
  sqm:{type:DataTypes.STRING(64)},
  mount:{type:DataTypes.STRING(32)},
  criticalMidRail:{type:DataTypes.STRING(32)},
  horizontalTpost:{type:DataTypes.STRING(32)},
  tiltOption:{type:DataTypes.STRING(64)},
  midRail1:{type:DataTypes.STRING(64)},
  midRail2:{type:DataTypes.STRING(64)},
  split1:{type:DataTypes.STRING(64)},
  split2:{type:DataTypes.STRING(64)},
  tierOnTier1:{type:DataTypes.STRING(64)},
  tierOnTier2:{type:DataTypes.STRING(64)},
  firstPanelOpening:{type:DataTypes.STRING(64)},
  postPosition1:{type:DataTypes.STRING(64)},
  postPosition2:{type:DataTypes.STRING(64)},
  postPosition3:{type:DataTypes.STRING(64)},
  postPosition4:{type:DataTypes.STRING(64)},
  postPosition5:{type:DataTypes.STRING(64)},
  postPosition6:{type:DataTypes.STRING(64)},
  angle1:{type:DataTypes.STRING(64)},
  angle2:{type:DataTypes.STRING(64)},
  angle3:{type:DataTypes.STRING(64)},
  angle4:{type:DataTypes.STRING(64)},
  angle5:{type:DataTypes.STRING(64)},
  angle6:{type:DataTypes.STRING(64)},
  louvresOpening:{type:DataTypes.STRING(32)},
  louvresSize:{type:DataTypes.STRING(64)},
  stile:{type:DataTypes.STRING(64)},
  tpost:{type:DataTypes.STRING(64)},
  frameType:{type:DataTypes.STRING(64)},
  frameSideLeft:{type:DataTypes.STRING(8)},
  frameSideRight:{type:DataTypes.STRING(8)},
  frameSideTop:{type:DataTypes.STRING(8)},
  frameSideBottom:{type:DataTypes.STRING(8)},
  cilplatesLeft:{type:DataTypes.STRING(8)},
  cilplatesRight:{type:DataTypes.STRING(8)},
  cilplatesTop:{type:DataTypes.STRING(8)},
  cilplatesBottom:{type:DataTypes.STRING(8)},
  buildUpLeft:{type:DataTypes.STRING(64)},
  buildUpRight:{type:DataTypes.STRING(64)},
  buildUpTop:{type:DataTypes.STRING(64)},
  buildUpBottom:{type:DataTypes.STRING(64)},
  battensWidth:{type:DataTypes.STRING(64)},
  battensDepth:{type:DataTypes.STRING(64)},
  battensHeight:{type:DataTypes.STRING(64)},
  shutterColor:{type:DataTypes.STRING(64)},
  hingeColor:{type:DataTypes.STRING(64)},
  notes:{type:DataTypes.STRING(255)},
  slidingOption:{type:DataTypes.STRING(64)},
  trackOption:{type:DataTypes.STRING(64)},
  shapeType:{type:DataTypes.STRING(64)},
  drawingUpload:{type:DataTypes.STRING(255)},
  drawingUploadFileId:{type:DataTypes.STRING(36)}
},{tableName:"order_lines",timestamps:false})

const Remake=sequelize.define("Remake",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  remakeNo:{type:DataTypes.STRING(80)},
  remakeIndex:{type:DataTypes.INTEGER},
  orderId:{type:DataTypes.STRING(36)},
  orderNo:{type:DataTypes.STRING(64)},
  companyId:{type:DataTypes.STRING(36)},
  userId:{type:DataTypes.STRING(36)},
  lineId:{type:DataTypes.STRING(36)},
  lineLabel:{type:DataTypes.STRING(255)},
  typeList:{type:DataTypes.STRING(1024)},
  note:{type:DataTypes.STRING(1024)},
  comment:{type:DataTypes.STRING(1024)},
  status:{type:DataTypes.STRING(32)},
  fileId:{type:DataTypes.STRING(36)},
  fileName:{type:DataTypes.STRING(255)},
  date:{type:DataTypes.STRING(32)}
},{tableName:"remakes",timestamps:false})

const CartLine=sequelize.define("CartLine",{
  id:{type:DataTypes.STRING(36),primaryKey:true},
  userId:{type:DataTypes.STRING(36)},
  room:{type:DataTypes.STRING(255)},
  product:{type:DataTypes.STRING(64)},
  style:{type:DataTypes.STRING(64)},
  width:{type:DataTypes.STRING(64)},
  height:{type:DataTypes.STRING(64)},
  panelConfig:{type:DataTypes.STRING(64)},
  sqm:{type:DataTypes.STRING(64)},
  mount:{type:DataTypes.STRING(32)},
  criticalMidRail:{type:DataTypes.STRING(32)},
  horizontalTpost:{type:DataTypes.STRING(32)},
  tiltOption:{type:DataTypes.STRING(64)},
  midRail1:{type:DataTypes.STRING(64)},
  midRail2:{type:DataTypes.STRING(64)},
  split1:{type:DataTypes.STRING(64)},
  split2:{type:DataTypes.STRING(64)},
  tierOnTier1:{type:DataTypes.STRING(64)},
  tierOnTier2:{type:DataTypes.STRING(64)},
  firstPanelOpening:{type:DataTypes.STRING(64)},
  postPosition1:{type:DataTypes.STRING(64)},
  postPosition2:{type:DataTypes.STRING(64)},
  postPosition3:{type:DataTypes.STRING(64)},
  postPosition4:{type:DataTypes.STRING(64)},
  postPosition5:{type:DataTypes.STRING(64)},
  postPosition6:{type:DataTypes.STRING(64)},
  angle1:{type:DataTypes.STRING(64)},
  angle2:{type:DataTypes.STRING(64)},
  angle3:{type:DataTypes.STRING(64)},
  angle4:{type:DataTypes.STRING(64)},
  angle5:{type:DataTypes.STRING(64)},
  angle6:{type:DataTypes.STRING(64)},
  louvresOpening:{type:DataTypes.STRING(32)},
  louvresSize:{type:DataTypes.STRING(64)},
  stile:{type:DataTypes.STRING(64)},
  tpost:{type:DataTypes.STRING(64)},
  frameType:{type:DataTypes.STRING(64)},
  frameSideLeft:{type:DataTypes.STRING(8)},
  frameSideRight:{type:DataTypes.STRING(8)},
  frameSideTop:{type:DataTypes.STRING(8)},
  frameSideBottom:{type:DataTypes.STRING(8)},
  cilplatesLeft:{type:DataTypes.STRING(8)},
  cilplatesRight:{type:DataTypes.STRING(8)},
  cilplatesTop:{type:DataTypes.STRING(8)},
  cilplatesBottom:{type:DataTypes.STRING(8)},
  buildUpLeft:{type:DataTypes.STRING(64)},
  buildUpRight:{type:DataTypes.STRING(64)},
  buildUpTop:{type:DataTypes.STRING(64)},
  buildUpBottom:{type:DataTypes.STRING(64)},
  battensWidth:{type:DataTypes.STRING(64)},
  battensDepth:{type:DataTypes.STRING(64)},
  battensHeight:{type:DataTypes.STRING(64)},
  shutterColor:{type:DataTypes.STRING(64)},
  hingeColor:{type:DataTypes.STRING(64)},
  notes:{type:DataTypes.STRING(255)},
  slidingOption:{type:DataTypes.STRING(64)},
  trackOption:{type:DataTypes.STRING(64)},
  shapeType:{type:DataTypes.STRING(64)},
  drawingUpload:{type:DataTypes.STRING(255)},
  drawingUploadFileId:{type:DataTypes.STRING(36)}
},{tableName:"cart_lines",timestamps:false})

const OrderSequence=sequelize.define("OrderSequence",{
  companyId:{type:DataTypes.STRING(36),primaryKey:true},
  seq:{type:DataTypes.STRING(32)}
},{tableName:"order_sequence",timestamps:false})

User.belongsTo(Company,{foreignKey:"companyId"})
Order.belongsTo(Company,{foreignKey:"companyId"})
Order.belongsTo(User,{foreignKey:"userId"})
OrderLine.belongsTo(Order,{foreignKey:"orderId"})
CartLine.belongsTo(User,{foreignKey:"userId"})
Remake.belongsTo(Order,{foreignKey:"orderId"})
Remake.belongsTo(User,{foreignKey:"userId"})
Remake.belongsTo(Company,{foreignKey:"companyId"})

module.exports={Company,User,Profile,Color,CompanyConfig,ExcelExport,File,Order,OrderLine,Remake,CartLine,OrderSequence}
