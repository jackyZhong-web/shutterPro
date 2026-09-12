const {OrderSequence}=require("../models")

const findOrCreate=(companyId,transaction)=>{
  const options={where:{companyId},defaults:{seq:"1"}}
  if(transaction){
    options.transaction=transaction
    options.lock=transaction.LOCK.UPDATE
  }
  return OrderSequence.findOrCreate(options)
}
const update=(companyId,data,transaction)=>OrderSequence.update(data,{where:{companyId},transaction})

module.exports={findOrCreate,update}
