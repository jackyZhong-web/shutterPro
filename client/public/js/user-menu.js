window.userMenuInit=()=>{
  const menu=document.querySelector("[data-user-menu]")
  if(!menu)return
  const avatar=menu.querySelector("[data-user-avatar]")
  const toggleMenu=()=>{
    menu.classList.toggle("open")
  }
  if(avatar){
    avatar.addEventListener("click",(e)=>{
      e.stopPropagation()
      toggleMenu()
    })
  }
  document.addEventListener("click",()=>{
    menu.classList.remove("open")
  })
  menu.querySelectorAll("[data-user-action]").forEach(btn=>{
    btn.addEventListener("click",async(e)=>{
      e.stopPropagation()
      const action=btn.dataset.userAction
      menu.classList.remove("open")
      if(action==="logout"){
        window.clearToken()
        location.href="/login.html"
        return
      }
      if(action==="password"){
        const payload=await openFormModal({
          title:"Change Password",
          fields:[
            {name:"currentPassword",label:"Current Password",type:"password",required:true},
            {name:"newPassword",label:"New Password",type:"password",required:true}
          ],
          values:{}
        })
        if(!payload)return
        const res=await window.apiFetch("/auth/change-password",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
        if(!res||!res.ok){
          await openConfirmModal({title:"Change Password",content:"Update failed. Please check your current password.",confirmLabel:"OK"})
          return
        }
        await openConfirmModal({title:"Change Password",content:"Password updated successfully.",confirmLabel:"OK"})
      }
    })
  })
}

const getUserModal=()=>{
  let root=document.querySelector(".user-modal")
  if(root)return root
  root=document.createElement("div")
  root.className="user-modal"
  root.innerHTML=`
    <div class="user-modal-backdrop"></div>
    <div class="user-modal-card">
      <div class="user-modal-header">
        <strong data-modal-title></strong>
        <button class="ghost" data-modal-close>Close</button>
      </div>
      <div class="user-modal-body" data-modal-body></div>
      <div class="user-modal-actions">
        <button class="ghost" data-modal-cancel>Cancel</button>
        <button class="primary" data-modal-submit>Save</button>
      </div>
    </div>
  `
  document.body.appendChild(root)
  root.querySelector("[data-modal-close]").addEventListener("click",()=>closeUserModal(null))
  root.querySelector("[data-modal-cancel]").addEventListener("click",()=>closeUserModal(null))
  root.querySelector(".user-modal-backdrop").addEventListener("click",()=>closeUserModal(null))
  return root
}

let userModalResolver=null

const closeUserModal=(value)=>{
  const root=document.querySelector(".user-modal")
  if(!root)return
  root.classList.remove("is-open")
  const body=root.querySelector("[data-modal-body]")
  if(body)body.innerHTML=""
  if(userModalResolver){
    userModalResolver(value)
    userModalResolver=null
  }
}

const openFormModal=({title,fields,values,submitLabel})=>{
  const root=getUserModal()
  root.querySelector("[data-modal-title]").textContent=title||"Edit"
  const submitBtn=root.querySelector("[data-modal-submit]")
  submitBtn.textContent=submitLabel||"Save"
  const body=root.querySelector("[data-modal-body]")
  const form=document.createElement("form")
  form.className="user-modal-form"
  const formError=document.createElement("div")
  formError.className="user-modal-error"
  form.appendChild(formError)
  fields.forEach(field=>{
    const wrap=document.createElement("div")
    wrap.className="form-field"
    if(field.fullWidth||field.type==="file")wrap.classList.add("field-full")
    const label=document.createElement("label")
    label.textContent=field.label||field.name
    if(field.required){
      const star=document.createElement("span")
      star.className="required-mark"
      star.textContent="*"
      label.appendChild(star)
    }
    wrap.appendChild(label)
    let input
    if(field.type==="textarea"){
      input=document.createElement("textarea")
      if(field.rows)input.rows=field.rows
    }else{
      input=document.createElement("input")
      input.type=field.type||"text"
    }
    input.name=field.name
    input.placeholder=field.placeholder||""
    if(values&&values[field.name]!==undefined)input.value=values[field.name]
    if(field.step!==undefined)input.step=field.step
    if(field.disabled)input.disabled=true
    wrap.appendChild(input)
    const error=document.createElement("div")
    error.className="field-error"
    wrap.appendChild(error)
    input.addEventListener("input",()=>{
      wrap.classList.remove("invalid")
      error.textContent=""
      formError.textContent=""
    })
    form.appendChild(wrap)
  })
  body.innerHTML=""
  body.appendChild(form)
  root.classList.add("is-open")
  const validate=()=>{
    let ok=true
    formError.textContent=""
    fields.forEach(field=>{
      const input=form.querySelector(`[name="${field.name}"]`)
      if(!input)return
      const wrap=input.closest(".form-field")
      const error=wrap.querySelector(".field-error")
      wrap.classList.remove("invalid")
      error.textContent=""
      const value=String(input.value||"").trim()
      if(field.required&&!value){
        wrap.classList.add("invalid")
        error.textContent=field.requiredMessage||"This field is required."
        ok=false
        return
      }
      if(value&&field.pattern){
        const regex=field.pattern instanceof RegExp?field.pattern:new RegExp(field.pattern)
        if(!regex.test(value)){
          wrap.classList.add("invalid")
          error.textContent=field.patternMessage||"Invalid format."
          ok=false
          return
        }
      }
      if(value&&field.validate){
        const msg=field.validate(value)
        if(msg){
          wrap.classList.add("invalid")
          error.textContent=msg
          ok=false
        }
      }
    })
    if(!ok)formError.textContent="Please fix the highlighted fields."
    return ok
  }
  return new Promise(resolve=>{
    userModalResolver=resolve
    submitBtn.onclick=(e)=>{
      e.preventDefault()
      if(!validate())return
      const result={}
      fields.forEach(field=>{
        const input=form.querySelector(`[name="${field.name}"]`)
        if(!input)return
        result[field.name]=input.value
      })
      closeUserModal(result)
    }
  })
}

const openConfirmModal=({title,content,confirmLabel})=>{
  const root=getUserModal()
  root.querySelector("[data-modal-title]").textContent=title||"Confirm"
  root.querySelector("[data-modal-submit]").textContent=confirmLabel||"Confirm"
  const body=root.querySelector("[data-modal-body]")
  body.innerHTML=`<div class="user-modal-text">${content||""}</div>`
  root.classList.add("is-open")
  return new Promise(resolve=>{
    userModalResolver=resolve
    root.querySelector("[data-modal-submit]").onclick=(e)=>{
      e.preventDefault()
      closeUserModal(true)
    }
  })
}
