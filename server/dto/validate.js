const validate=(schema,data)=>{
  const result=schema.safeParse(data)
  if(result.success)return {ok:true,data:result.data}
  const issues=result.error.errors.map(e=>({path:e.path.join("."),message:e.message}))
  return {ok:false,issues}
}

module.exports={validate}
