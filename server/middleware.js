const jwt=require("jsonwebtoken")

const JWT_SECRET=process.env.JWT_SECRET||"dev-secret"

const authMiddleware=(req,res,next)=>{
  const header=req.headers.authorization||""
  const token=header.startsWith("Bearer ")?header.slice(7):""
  if(!token)return res.status(401).json({error:"unauthorized"})
  try{const payload=jwt.verify(token,JWT_SECRET);req.user=payload;return next()}catch(e){return res.status(401).json({error:"unauthorized"})}
}

const adminOnly=(req,res,next)=>{if(req.user.role!=="Admin")return res.status(403).json({error:"forbidden"});return next()}

module.exports={authMiddleware,adminOnly,JWT_SECRET}
