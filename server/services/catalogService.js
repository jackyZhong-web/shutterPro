const profileRepo=require("../repositories/profileRepo")
const colorRepo=require("../repositories/colorRepo")

const profileNameCollator=new Intl.Collator("en",{numeric:true,sensitivity:"base"})
const toTimeValue=(value)=>{
  const ts=Date.parse(String(value||""))
  return Number.isFinite(ts)?ts:0
}
const sortProfiles=(rows)=>rows.slice().sort((a,b)=>{
  const nameCompare=profileNameCollator.compare(String(a&&a.name||"").trim(),String(b&&b.name||"").trim())
  if(nameCompare!==0)return nameCompare
  const createdAtCompare=toTimeValue(a&&a.createdAt)-toTimeValue(b&&b.createdAt)
  if(createdAtCompare!==0)return createdAtCompare
  return String(a&&a.id||"").localeCompare(String(b&&b.id||""),"en",{sensitivity:"base"})
})

const listProfiles=async(where)=>sortProfiles(await profileRepo.findAll(where))
const listColors=(where)=>colorRepo.findAll(where)

module.exports={listProfiles,listColors}
