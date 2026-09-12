window.adminInit=()=>{
  initUserMenu()
  const page=document.body.getAttribute("data-page")||""
  if(page==="admin-company")return initCompany()
  if(page==="admin-user")return initUser()
  if(page==="admin-color")return initColor()
  if(page==="admin-profile")return initProfile()
  if(page==="admin-excel")return initExcel()
}

const safeParse=(value)=>{
  if(!value)return null
  try{return JSON.parse(value)}catch(e){return null}
}
const adminT=(key,fallback="")=>{
  if(window.adminI18n&&typeof window.adminI18n.t==="function")return window.adminI18n.t(key,fallback)
  return fallback||key
}

const getApiBase=()=>{
  const metaBase=document.querySelector("meta[name='api-base']")
  const baseFromMeta=metaBase&&metaBase.content?metaBase.content:""
  const baseFromWindow=window.API_BASE||""
  if(baseFromMeta||baseFromWindow)return baseFromMeta||baseFromWindow
  return location.port&&location.port!=="3000"?"http://localhost:3000":""
}

const normalizeFilePath=(value)=>{
  if(!value)return ""
  if(/^https?:\/\//.test(value))return value
  if(value.startsWith("/"))return value
  return `/files/${value}`
}

const setPreviewEmpty=(preview)=>{
  const content=preview.querySelector(".file-preview-content")
  const clearBtn=preview.querySelector(".file-clear")
  const emptyText=preview.dataset.emptyText||"Click to upload"
  if(content)content.innerHTML=`<div class="file-preview-empty">${emptyText}</div>`
  if(clearBtn)clearBtn.style.display="none"
}

const clearPreview=(preview)=>{
  const oldUrl=preview.dataset.objectUrl
  if(oldUrl)URL.revokeObjectURL(oldUrl)
  preview.dataset.objectUrl=""
  setPreviewEmpty(preview)
}

const setPreviewImage=async(preview,value)=>{
  const content=preview.querySelector(".file-preview-content")
  const clearBtn=preview.querySelector(".file-clear")
  const path=normalizeFilePath(value)
  if(!path){
    clearPreview(preview)
    return
  }
  if(/^https?:\/\//.test(path)){
    const oldUrl=preview.dataset.objectUrl
    if(oldUrl)URL.revokeObjectURL(oldUrl)
    preview.dataset.objectUrl=""
    if(content)content.innerHTML=`<img src="${path}" alt="">`
    if(clearBtn)clearBtn.style.display=""
    return
  }
  const res=await window.apiFetch(path)
  if(!res||!res.ok){
    clearPreview(preview)
    return
  }
  const blob=await res.blob()
  const url=URL.createObjectURL(blob)
  const oldUrl=preview.dataset.objectUrl
  if(oldUrl)URL.revokeObjectURL(oldUrl)
  preview.dataset.objectUrl=url
  if(content)content.innerHTML=`<img src="${url}" alt="">`
  if(clearBtn)clearBtn.style.display=""
}

const DEFAULT_MATERIAL_OPTIONS=[
  {code:"Hollow",label:"LARK™ Lightweight Shutters"},
  {code:"Coated Paulownia",label:"Coated Paulownia"},
  {code:"Basswood",label:"CARVER™ Wood Shutters"},
  {code:"PVC",label:"TENET™ Composite Shutters"},
  {code:"Sunnex Poly",label:"Sunnex Poly"},
  {code:"Sunnex Wood",label:"Sunnex Wood"},
  {code:"Sunnex Hollow",label:"Sunnex Hollow"}
]
const loadMaterialOptions=async()=>{
  const fallback=window.materialCatalog&&typeof window.materialCatalog.getOptionsSync==="function"
    ? window.materialCatalog.getOptionsSync()
    : DEFAULT_MATERIAL_OPTIONS.map(item=>({...item}))
  if(window.materialCatalog&&typeof window.materialCatalog.load==="function"){
    const loaded=await window.materialCatalog.load()
    return Array.isArray(loaded)&&loaded.length?loaded:fallback
  }
  return fallback
}

const initUserMenu=()=>{
  const card=window.qs(".user-card")
  if(!card)return
  const avatar=card.querySelector(".icon-btn")
  if(!avatar)return
  card.classList.add("user-menu")
  if(!card.querySelector(".user-lang")){
    const wrap=document.createElement("div")
    wrap.className="user-lang"
    wrap.innerHTML=`
      <label data-i18n="admin.common.language">Language</label>
      <select class="table-select" data-admin-lang-switch>
        <option value="en">EN</option>
        <option value="zh-CN">中文</option>
      </select>
    `
    card.appendChild(wrap)
  }
  if(!card.querySelector(".user-menu-panel")){
    const panel=document.createElement("div")
    panel.className="user-menu-panel"
    panel.innerHTML=`
      <button class="user-menu-item" data-user-action="password">Change Password</button>
      <button class="user-menu-item" data-user-action="logout">Logout</button>
    `
    card.appendChild(panel)
  }
  const toggleMenu=()=>{
    card.classList.toggle("open")
  }
  avatar.addEventListener("click",(e)=>{
    e.stopPropagation()
    toggleMenu()
  })
  document.addEventListener("click",()=>{
    card.classList.remove("open")
  })
  card.querySelectorAll("[data-user-action]").forEach(btn=>{
    btn.addEventListener("click",async(e)=>{
      e.stopPropagation()
      const action=btn.dataset.userAction
      card.classList.remove("open")
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

const getModal=()=>{
  let root=document.querySelector(".admin-modal")
  if(root)return root
  root=document.createElement("div")
  root.className="admin-modal"
  root.innerHTML=`
    <div class="admin-modal-backdrop"></div>
    <div class="admin-modal-card">
      <div class="admin-modal-header">
        <strong data-modal-title></strong>
        <button class="ghost" data-modal-close>Close</button>
      </div>
      <div class="admin-modal-body" data-modal-body></div>
      <div class="admin-modal-actions">
        <button class="ghost" data-modal-cancel>Cancel</button>
        <button class="primary" data-modal-submit>Save</button>
      </div>
    </div>
  `
  document.body.appendChild(root)
  root.querySelector("[data-modal-close]").addEventListener("click",()=>closeModal(null))
  root.querySelector("[data-modal-cancel]").addEventListener("click",()=>closeModal(null))
  root.querySelector(".admin-modal-backdrop").addEventListener("click",()=>closeModal(null))
  return root
}

let modalResolver=null

const closeModal=(value)=>{
  const root=document.querySelector(".admin-modal")
  if(!root)return
  root.classList.remove("is-open")
  const body=root.querySelector("[data-modal-body]")
  if(body)body.innerHTML=""
  if(modalResolver){
    modalResolver(value)
    modalResolver=null
  }
}

const openFormModal=({title,fields,values,submitLabel})=>{
  const root=getModal()
  root.querySelector("[data-modal-title]").textContent=title||"Edit"
  const submitBtn=root.querySelector("[data-modal-submit]")
  submitBtn.textContent=submitLabel||"Save"
  const body=root.querySelector("[data-modal-body]")
  const form=document.createElement("form")
  form.className="admin-modal-form"
  const formError=document.createElement("div")
  formError.className="admin-modal-error"
  form.appendChild(formError)
  const fileValues={}
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
    if(field.type==="select"){
      input=document.createElement("select")
      ;(field.options||[]).forEach(opt=>{
        const option=document.createElement("option")
        option.value=String(opt.value)
        option.textContent=opt.label
        input.appendChild(option)
      })
    }else if(field.type==="file"){
      const picker=document.createElement("div")
      picker.className="file-picker"
      input=document.createElement("input")
      input.type="file"
      input.className="file-input"
      if(field.accept)input.accept=field.accept
      const preview=document.createElement("div")
      preview.className="file-preview"
      preview.dataset.emptyText="Click to upload"
      const previewContent=document.createElement("div")
      previewContent.className="file-preview-content"
      preview.appendChild(previewContent)
      const clearBtn=document.createElement("button")
      clearBtn.type="button"
      clearBtn.className="file-clear"
      clearBtn.textContent="Remove"
      clearBtn.addEventListener("click",(e)=>{
        e.preventDefault()
        e.stopPropagation()
        fileValues[`${field.name}__clear`]=true
        fileValues[field.name]=null
        input.value=""
        clearPreview(preview)
      })
      preview.appendChild(clearBtn)
      const existingValue=field.previewValueName&&values?values[field.previewValueName]:values?values[field.name]:null
      if(existingValue){
        setPreviewImage(preview,existingValue)
      }else{
        clearPreview(preview)
      }
      preview.appendChild(input)
      picker.appendChild(preview)
      wrap.appendChild(picker)
      input.addEventListener("change",()=>{
        const file=input.files&&input.files[0]
        if(file){
          fileValues[`${field.name}__clear`]=false
          fileValues[field.name]=file
          const reader=new FileReader()
          reader.onload=()=>{
            const content=preview.querySelector(".file-preview-content")
            if(content)content.innerHTML=`<img src="${reader.result}" alt="">`
            clearBtn.style.display=""
          }
          reader.readAsDataURL(file)
        }else{
          fileValues[field.name]=null
        }
        wrap.classList.remove("invalid")
        const error=wrap.querySelector(".field-error")
        if(error)error.textContent=""
        formError.textContent=""
      })
    }else if(field.type==="textarea"){
      input=document.createElement("textarea")
      if(field.rows)input.rows=field.rows
    }else{
      input=document.createElement("input")
      input.type=field.type||"text"
    }
    input.name=field.name
    input.placeholder=field.placeholder||""
    if(values&&values[field.name]!==undefined&&field.type!=="file")input.value=values[field.name]
    if(field.step!==undefined&&field.type!=="file")input.step=field.step
    if(field.disabled)input.disabled=true
    if(field.type==="password"){
      const passwordWrap=document.createElement("div")
      passwordWrap.className="password-input-wrap"
      const toggleBtn=document.createElement("button")
      toggleBtn.type="button"
      toggleBtn.className="password-toggle-btn"
      toggleBtn.textContent="👁"
      toggleBtn.setAttribute("aria-label","Show password")
      toggleBtn.addEventListener("click",(e)=>{
        e.preventDefault()
        const visible=input.type==="text"
        input.type=visible?"password":"text"
        toggleBtn.textContent=visible?"👁":"🙈"
        toggleBtn.setAttribute("aria-label",visible?"Show password":"Hide password")
      })
      passwordWrap.appendChild(input)
      passwordWrap.appendChild(toggleBtn)
      wrap.appendChild(passwordWrap)
    }else if(field.type!=="file")wrap.appendChild(input)
    const error=document.createElement("div")
    error.className="field-error"
    wrap.appendChild(error)
    if(field.type!=="file"){
      input.addEventListener("input",()=>{
        wrap.classList.remove("invalid")
        error.textContent=""
        formError.textContent=""
      })
    }
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
      const value=field.type==="file"?"":String(input.value||"").trim()
      const existingValue=field.previewValueName&&values?values[field.previewValueName]:values?values[field.name]:null
      const fileSelected=!!fileValues[field.name]
      if(field.required&&field.type==="file"&&!fileSelected&&!existingValue){
        wrap.classList.add("invalid")
        error.textContent=field.requiredMessage||"This field is required."
        ok=false
        return
      }
      if(field.required&&field.type!=="file"&&!value){
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
    modalResolver=resolve
    submitBtn.onclick=(e)=>{
      e.preventDefault()
      if(!validate())return
      const result={}
      fields.forEach(field=>{
        const input=form.querySelector(`[name="${field.name}"]`)
        if(!input)return
        if(field.type==="file"){
          result[field.name]=fileValues[field.name]||null
          result[`${field.name}Clear`]=!!fileValues[`${field.name}__clear`]
        }else result[field.name]=input.value
      })
      closeModal(result)
    }
  })
}

const openConfirmModal=({title,content,confirmLabel})=>{
  const root=getModal()
  root.querySelector("[data-modal-title]").textContent=title||"Confirm"
  root.querySelector("[data-modal-submit]").textContent=confirmLabel||"Confirm"
  const body=root.querySelector("[data-modal-body]")
  body.innerHTML=`<div class="admin-modal-text">${content||""}</div>`
  root.classList.add("is-open")
  return new Promise(resolve=>{
    modalResolver=resolve
    root.querySelector("[data-modal-submit]").onclick=(e)=>{
      e.preventDefault()
      closeModal(true)
    }
  })
}

const initCompany=()=>{
  const tbody=window.qs("[data-company-list]")
  const searchInput=window.qs(".table-head .search")
  const addBtn=window.qs(".page-header .primary")
  if(!tbody||!addBtn)return
  let cache={}
  let existingAbbr=new Set()
  let rowsCache=[]
  const toText=value=>String(value||"").toLowerCase()
  const sortByName=(a,b)=>toText(a.name).localeCompare(toText(b.name),"en",{sensitivity:"base"})
  const render=(rows)=>{
    cache={}
    existingAbbr=new Set()
    tbody.innerHTML=""
    rows.forEach(row=>{
      cache[row.id]=row
      if(row.abbr)existingAbbr.add(String(row.abbr))
      const tr=document.createElement("tr")
      tr.innerHTML=`
        <td>${row.name||""}</td>
        <td>${row.abbr||""}</td>
        <td>${row.contact||""}</td>
        <td>${row.street||""}</td>
        <td>${row.city||""}</td>
        <td>${row.state||""}</td>
        <td>${row.zip||""}</td>
        <td>${row.country||""}</td>
        <td>${row.addressType||""}</td>
        <td>${row.phone||""}</td>
        <td>${row.fax||""}</td>
        <td class="actions">
          <span class="icon-btn" data-action="edit" data-id="${row.id}">✎</span>
          <span class="icon-btn" data-action="delete" data-id="${row.id}">🗑</span>
        </td>
      `
      tbody.appendChild(tr)
    })
  }
  const load=async()=>{
    const res=await window.apiFetch("/companies")
    if(!res)return
    const rows=await res.json()
    rowsCache=(rows||[]).slice().sort(sortByName)
    applyFilter()
  }
  const applyFilter=()=>{
    const q=toText(searchInput?searchInput.value:"")
    const filtered=rowsCache.filter(row=>{
      if(!q)return true
      const values=[row.name,row.abbr,row.contact,row.street,row.city,row.state,row.zip,row.country,row.addressType,row.phone,row.fax,row.id]
      return values.some(v=>toText(v).includes(q))
    })
    render(filtered)
  }
  if(searchInput){
    searchInput.addEventListener("keydown",e=>{
      if(e.key==="Enter")applyFilter()
    })
  }
  const collect=(defaults={})=>{
    return openFormModal({
      title:defaults.id?adminT("admin.company.modal.edit","Edit Company"):adminT("admin.company.modal.add","Add Company"),
      fields:[
        {name:"name",label:adminT("admin.company.col.name","Company Name"),required:true},
        {name:"abbr",label:adminT("admin.company.col.code","Company Code"),required:true,validate:(value)=>existingAbbr.has(value)&&value!==defaults.abbr?adminT("admin.company.validate.code_unique","Company Code must be unique."):''},
        {name:"contact",label:adminT("admin.company.col.contact","Contact")},
        {name:"street",label:adminT("admin.company.col.street","Street")},
        {name:"city",label:adminT("admin.company.col.city","City")},
        {name:"state",label:adminT("admin.company.col.state","State")},
        {name:"zip",label:adminT("admin.company.col.zip","Zip")},
        {name:"country",label:adminT("admin.company.col.country","Country"),required:true},
        {name:"addressType",label:adminT("admin.company.col.address_type","Address Type")},
        {name:"phone",label:adminT("admin.company.col.phone","Phone")},
        {name:"fax",label:adminT("admin.company.col.fax","Fax")}
      ],
      values:defaults
    })
  }
  addBtn.addEventListener("click",async()=>{
    const payload=await collect()
    if(!payload)return
    const res=await window.apiFetch("/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    if(res&&res.ok)load()
  })
  tbody.addEventListener("click",async(e)=>{
    const btn=e.target.closest("[data-action]")
    if(!btn)return
    const id=btn.dataset.id
    if(btn.dataset.action==="delete"){
      const ok=await openConfirmModal({title:adminT("admin.company.modal.delete_title","Delete Company"),content:adminT("admin.company.modal.delete_content","Delete this company?")})
      if(!ok)return
      const res=await window.apiFetch(`/companies/${id}`,{method:"DELETE"})
      if(res&&res.ok)load()
      return
    }
    if(btn.dataset.action==="edit"){
      const current=cache[id]||{}
      const payload=await collect(current)
      if(!payload)return
      const res=await window.apiFetch(`/companies/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
      if(res&&res.ok)load()
    }
  })
  window.addEventListener("admin-lang-changed",()=>{applyFilter()})
  load()
}

const initUser=()=>{
  const tbody=window.qs("[data-user-list]")
  const searchInput=window.qs(".table-head .search")
  const addBtn=window.qs(".page-header .primary")
  if(!tbody||!addBtn)return
  let cache={}
  let companyMap={}
  let rowsCache=[]
  const toText=value=>String(value||"").toLowerCase()
  const loadCompanies=async()=>{
    const res=await window.apiFetch("/companies")
    if(!res)return {}
    const rows=await res.json()
    const map={}
    ;(rows||[]).forEach(r=>{map[r.id]={name:r.name||r.id,abbr:r.abbr||""}})
    companyMap=map
  }
  const render=(rows)=>{
    cache={}
    tbody.innerHTML=""
    rows.forEach(row=>{
      cache[row.id]=row
      const tr=document.createElement("tr")
      const companyName=(companyMap[row.companyId]&&companyMap[row.companyId].name)||row.companyId||""
      tr.innerHTML=`
        <td>${companyName}</td>
        <td>${row.customerName||""}</td>
        <td>${row.email||""}</td>
        <td>${row.phone||""}</td>
        <td>******</td>
        <td class="actions">
          <span class="icon-btn" data-action="edit" data-id="${row.id}">✎</span>
          <span class="icon-btn" data-action="delete" data-id="${row.id}">🗑</span>
        </td>
      `
      tbody.appendChild(tr)
    })
  }
  const load=async()=>{
    await loadCompanies()
    const res=await window.apiFetch("/users")
    if(!res)return
    const rows=await res.json()
    rowsCache=(rows||[]).slice()
    applyFilter()
  }
  const applyFilter=()=>{
    const q=toText(searchInput?searchInput.value:"")
    const filtered=rowsCache.filter(row=>{
      if(!q)return true
      const company=companyMap[row.companyId]||{}
      const values=[row.customerName,row.email,row.phone,row.role,row.companyId,company.name,company.abbr]
      return values.some(v=>toText(v).includes(q))
    })
    filtered.sort((a,b)=>{
      const aName=toText((companyMap[a.companyId]&&companyMap[a.companyId].name)||"")
      const bName=toText((companyMap[b.companyId]&&companyMap[b.companyId].name)||"")
      return aName.localeCompare(bName,"en",{sensitivity:"base"})
    })
    render(filtered)
  }
  if(searchInput){
    searchInput.addEventListener("keydown",e=>{
      if(e.key==="Enter")applyFilter()
    })
  }
  const companyOptions=()=>Object.keys(companyMap).map(id=>({value:id,label:(companyMap[id]&&companyMap[id].name)||id}))
  const collectCreate=()=>{
    return openFormModal({
      title:adminT("admin.user.modal.add","Add User"),
      fields:[
        {name:"companyId",label:adminT("admin.user.col.company","Company"),type:"select",options:companyOptions(),required:true},
        {name:"role",label:adminT("admin.user.role","Role"),type:"select",options:[{value:"Admin",label:"Admin"},{value:"User",label:"User"}],required:true},
        {name:"customerName",label:adminT("admin.user.col.customer_name","Customer Name"),required:true},
        {name:"email",label:adminT("admin.user.col.email","Email"),pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,patternMessage:adminT("admin.user.validate.email","Invalid email format.")},
        {name:"phone",label:adminT("admin.user.col.phone","Phone")},
        {name:"password",label:adminT("admin.user.col.password","Password"),type:"password",required:true}
      ],
      values:{companyId:Object.keys(companyMap)[0]||"",role:"User"}
    })
  }
  const collectUpdate=(defaults={})=>{
    return openFormModal({
      title:adminT("admin.user.modal.edit","Edit User"),
      fields:[
        {name:"companyId",label:adminT("admin.user.col.company","Company"),type:"select",options:companyOptions(),required:true},
        {name:"role",label:adminT("admin.user.role","Role"),type:"select",options:[{value:"Admin",label:"Admin"},{value:"User",label:"User"}],required:true},
        {name:"customerName",label:adminT("admin.user.col.customer_name","Customer Name"),required:true},
        {name:"email",label:adminT("admin.user.col.email","Email"),pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,patternMessage:adminT("admin.user.validate.email","Invalid email format.")},
        {name:"phone",label:adminT("admin.user.col.phone","Phone")},
        {name:"password",label:adminT("admin.user.col.password","Password"),type:"password"}
      ],
      values:defaults
    })
  }
  addBtn.addEventListener("click",async()=>{
    const payload=await collectCreate()
    if(!payload)return
    const res=await window.apiFetch("/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    if(res&&res.ok)load()
  })
  tbody.addEventListener("click",async(e)=>{
    const btn=e.target.closest("[data-action]")
    if(!btn)return
    const id=btn.dataset.id
    if(btn.dataset.action==="delete"){
      const ok=await openConfirmModal({title:adminT("admin.user.modal.delete_title","Delete User"),content:adminT("admin.user.modal.delete_content","Delete this user?")})
      if(!ok)return
      const res=await window.apiFetch(`/users/${id}`,{method:"DELETE"})
      if(res&&res.ok)load()
      return
    }
    if(btn.dataset.action==="edit"){
      const current=cache[id]||{}
      const payload=await collectUpdate(current)
      if(!payload)return
      const res=await window.apiFetch(`/users/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
      if(res&&res.ok)load()
    }
  })
  window.addEventListener("admin-lang-changed",()=>{applyFilter()})
  load()
}

const initColor=()=>{
  const tbody=window.qs("[data-color-list]")
  const searchInput=window.qs(".table-head .search")
  const addBtn=window.qs(".page-header .primary")
  if(!tbody||!addBtn)return
  let cache={}
  let companyMap={}
  let rowsCache=[]
  const splitColors=(value)=>String(value||"").split("/").map(v=>v.trim()).filter(Boolean)
  const parseColorGroups=(value)=>{
    const raw=String(value||"").trim()
    if(!/shutter\s*:/i.test(raw)&&!/hinge\s*:/i.test(raw)){
      return {shutter:raw,hinge:raw,isLegacy:true}
    }
    let shutter=""
    let hinge=""
    raw.split(/\n|\|/).forEach(part=>{
      const items=part.split(":")
      if(items.length<2)return
      const key=items.shift().trim().toLowerCase()
      const list=items.join(":").trim()
      if(key==="shutter")shutter=list
      if(key==="hinge")hinge=list
    })
    return {shutter,hinge,isLegacy:false}
  }
  const formatColorGroups=(shutter,hinge)=>`shutter:${String(shutter||"").trim()}|hinge:${String(hinge||"").trim()}`
  const toText=value=>String(value||"").toLowerCase()
  const loadCompanies=async()=>{
    const res=await window.apiFetch("/companies")
    if(!res)return {}
    const rows=await res.json()
    const map={}
    ;(rows||[]).forEach(r=>{map[r.id]={name:r.name||r.id,abbr:r.abbr||""}})
    companyMap=map
  }
  const render=(rows)=>{
    cache={}
    tbody.innerHTML=""
    rows.forEach(row=>{
      cache[row.id]=row
      const tr=document.createElement("tr")
      tr.innerHTML=`
        <td>${(companyMap[row.companyId]&&companyMap[row.companyId].name)||row.companyId||""}</td>
        <td>
          <div class="color-group">
            <div class="color-group-label">${adminT("admin.config_proto.shutter_colors","Shutter")}</div>
            <div class="color-pills" data-color-shutter></div>
          </div>
          <div class="color-group">
            <div class="color-group-label">${adminT("admin.config_proto.hinge_colors","Hinge")}</div>
            <div class="color-pills" data-color-hinge></div>
          </div>
        </td>
        <td class="actions">
          <span class="icon-btn" data-action="edit" data-id="${row.id}">✎</span>
          <span class="icon-btn" data-action="delete" data-id="${row.id}">🗑</span>
        </td>
      `
      const shutterCell=tr.querySelector("[data-color-shutter]")
      const hingeCell=tr.querySelector("[data-color-hinge]")
      const groups=parseColorGroups(row.colorList)
      const shutterColors=splitColors(groups.shutter)
      const hingeColors=splitColors(groups.hinge)
      const renderPills=(cell,colors)=>{
        if(!cell)return
        if(colors.length===0){
          cell.textContent="-"
          return
        }
        colors.forEach(color=>{
          const pill=document.createElement("span")
          pill.className="color-pill"
          pill.textContent=color
          cell.appendChild(pill)
        })
      }
      renderPills(shutterCell,shutterColors)
      renderPills(hingeCell,hingeColors)
      tbody.appendChild(tr)
    })
  }
  const load=async()=>{
    await loadCompanies()
    const res=await window.apiFetch("/colors")
    if(!res)return
    const rows=await res.json()
    rowsCache=(rows||[]).slice()
    applyFilter()
  }
  const applyFilter=()=>{
    const q=toText(searchInput?searchInput.value:"")
    const filtered=rowsCache.filter(row=>{
      if(!q)return true
      const company=companyMap[row.companyId]||{}
      const groups=parseColorGroups(row.colorList)
      const values=[groups.shutter,groups.hinge,row.colorList,company.name,company.abbr,row.companyId]
      return values.some(v=>toText(v).includes(q))
    })
    filtered.sort((a,b)=>{
      const aName=toText((companyMap[a.companyId]&&companyMap[a.companyId].name)||"")
      const bName=toText((companyMap[b.companyId]&&companyMap[b.companyId].name)||"")
      return aName.localeCompare(bName,"en",{sensitivity:"base"})
    })
    render(filtered)
  }
  if(searchInput){
    searchInput.addEventListener("keydown",e=>{
      if(e.key==="Enter")applyFilter()
    })
  }
  const companyOptions=()=>Object.keys(companyMap).map(id=>({value:id,label:(companyMap[id]&&companyMap[id].name)||id}))
  const collect=(defaults={})=>{
    const groups=parseColorGroups(defaults.colorList)
    return openFormModal({
      title:defaults.id?adminT("admin.color.modal.edit","Edit Color Config"):adminT("admin.color.modal.add","Add Color Config"),
      fields:[
        {name:"companyId",label:adminT("admin.color.col.company","Company"),type:"select",options:companyOptions(),required:true},
        {name:"shutterColorList",label:adminT("admin.config_proto.shutter_colors","Shutter Colors"),type:"textarea",rows:3,placeholder:adminT("admin.config_proto.color_placeholder","White/Black/Gray"),required:true,validate:(value)=>{
          const parts=value.split("/").map(v=>v.trim()).filter(Boolean)
          if(parts.length===0)return adminT("admin.color.validate.shutter_required","Shutter colors are required.")
          if(parts.length!==value.split("/").length)return adminT("admin.color.validate.separator","Use '/' to separate colors without empty entries.")
          return ""
        }},
        {name:"hingeColorList",label:adminT("admin.config_proto.hinge_colors","Hinge Colors"),type:"textarea",rows:3,placeholder:adminT("admin.config_proto.color_placeholder","White/Black/Gray"),required:true,validate:(value)=>{
          const parts=value.split("/").map(v=>v.trim()).filter(Boolean)
          if(parts.length===0)return adminT("admin.color.validate.hinge_required","Hinge colors are required.")
          if(parts.length!==value.split("/").length)return adminT("admin.color.validate.separator","Use '/' to separate colors without empty entries.")
          return ""
        }}
      ],
      values:{companyId:defaults.companyId||Object.keys(companyMap)[0]||"",shutterColorList:groups.shutter,hingeColorList:groups.hinge}
    })
  }
  addBtn.addEventListener("click",async()=>{
    const payload=await collect()
    if(!payload)return
    const body={companyId:payload.companyId,colorList:formatColorGroups(payload.shutterColorList,payload.hingeColorList)}
    const res=await window.apiFetch("/colors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
    if(res&&res.ok)load()
  })
  tbody.addEventListener("click",async(e)=>{
    const btn=e.target.closest("[data-action]")
    if(!btn)return
    const id=btn.dataset.id
    if(btn.dataset.action==="delete"){
      const ok=await openConfirmModal({title:adminT("admin.color.modal.delete_title","Delete Color Config"),content:adminT("admin.color.modal.delete_content","Delete this color config?")})
      if(!ok)return
      const res=await window.apiFetch(`/colors/${id}`,{method:"DELETE"})
      if(res&&res.ok)load()
      return
    }
    if(btn.dataset.action==="edit"){
      const current=cache[id]||{}
      const payload=await collect(current)
      if(!payload)return
      const body={companyId:payload.companyId,colorList:formatColorGroups(payload.shutterColorList,payload.hingeColorList)}
      const res=await window.apiFetch(`/colors/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      if(res&&res.ok)load()
    }
  })
  window.addEventListener("admin-lang-changed",()=>{applyFilter()})
  load()
}

const initProfile=async()=>{
  const list=window.qs("[data-profile-list]")
  const materialWrap=window.qs(".profile-materials")
  if(materialWrap){
    const preferred=materialWrap.querySelector(".profile-pill.active")?.dataset.material||""
    const materialOptions=await loadMaterialOptions()
    materialWrap.innerHTML=""
    materialOptions.forEach((item,index)=>{
      const btn=document.createElement("button")
      btn.className=`profile-pill${(preferred?preferred===item.code:index===0)?" active":""}`
      btn.dataset.material=item.code
      btn.textContent=item.label||item.code
      materialWrap.appendChild(btn)
    })
  }
  const materialTabs=window.qsa(".profile-materials [data-material]")
  const categoryTabs=window.qsa("[data-category]")
  if(!list)return
  let cache={}
  let currentMaterial=materialTabs.find(t=>t.classList.contains("active"))?.dataset.material||"Hollow"
  let currentCategory=categoryTabs.find(t=>t.classList.contains("active"))?.dataset.category||"Stile"
  const toNumberString=(value)=>{
    const raw=String(value||"").trim()
    return raw
  }
  const parseProfileDataParts=(value)=>{
    const raw=String(value||"").trim()
    if(!raw)return {add:"",subtract:""}
    if(!raw.includes("/"))return {add:raw,subtract:""}
    const [add="",subtract=""]=raw.split("/",2)
    return {add:String(add||"").trim(),subtract:String(subtract||"").trim()}
  }
  const serializeProfileDataParts=(addValue,subtractValue)=>{
    const add=toNumberString(addValue)
    const subtract=toNumberString(subtractValue)
    if(!add&&!subtract)return ""
    if(!subtract)return add
    return `${add}/${subtract}`
  }
  const formatProfileDataDisplay=(value,isFrame)=>{
    const parts=parseProfileDataParts(value)
    if(!isFrame)return parts.add||String(value||"")
    const addText=parts.add||"-"
    const subtractText=parts.subtract||"-"
    return `+ ${addText} / - ${subtractText}`
  }
  const numericTextRule=/^\d+(\.\d+)?$/
  const numberValidator=(label)=>(value)=>{
    const raw=String(value||"").trim()
    if(!raw)return ""
    return numericTextRule.test(raw)? "": `${label} must be a number.`
  }
  const render=(rows)=>{
    cache={}
    list.innerHTML=""
    rows.forEach(row=>{
      cache[row.id]=row
      const isFrame=row.category==="Frame"
      const card=document.createElement("div")
      card.className="profile-card"
      card.innerHTML=`
        <div class="profile-image">
          <div class="file-preview-content"><div class="profile-empty"><div>▦</div><div>${adminT("admin.common.no_image","No Image")}</div></div></div>
        </div>
        <div class="profile-body">
          <strong>${adminT("admin.profile.card.name","Name")}: ${row.name||""}</strong>
          <div class="profile-meta">
            <div>${adminT("admin.profile.card.kd_code","KD Code")}: ${row.kdCode||""}</div>
            <div>${adminT("admin.profile.card.customer_code","Customer Code")}: ${row.customerCode||""}</div>
            <div>${adminT("admin.profile.card.data","Data")}: ${formatProfileDataDisplay(row.data||"",isFrame)}</div>
          </div>
          <div class="profile-actions">
            <span class="icon-btn" data-action="edit" data-id="${row.id}">✎</span>
            <span class="icon-btn" data-action="delete" data-id="${row.id}">🗑</span>
          </div>
        </div>
      `
      list.appendChild(card)
      const preview=card.querySelector(".profile-image")
      preview.dataset.emptyText=adminT("admin.common.no_image","No Image")
      setPreviewImage(preview,row.imageUrl||"")
    })
    const addCard=document.createElement("div")
    addCard.className="profile-card profile-add"
    addCard.setAttribute("data-action","add")
    addCard.innerHTML=`
      <div class="profile-body">
        <div class="profile-plus">+</div>
        <div>${adminT("admin.profile.card.add_component","Add New Component")}</div>
      </div>
    `
    list.appendChild(addCard)
  }
  const load=async()=>{
    const res=await window.apiFetch(`/profiles?material=${encodeURIComponent(currentMaterial)}&category=${encodeURIComponent(currentCategory)}`)
    if(!res)return
    const rows=await res.json()
    render(rows||[])
  }
  const collect=(defaults={})=>{
    const parts=parseProfileDataParts(defaults.data||"")
    const isFrame=currentCategory==="Frame"
    return openFormModal({
      title:defaults.id?adminT("admin.profile.modal.edit","Edit Profile"):adminT("admin.profile.modal.add","Add Profile"),
      fields:[
        {name:"imageFile",label:adminT("admin.profile.modal.image","Image"),type:"file",accept:"image/*",previewValueName:"imageValue"},
        {name:"name",label:adminT("admin.profile.modal.name","Name"),required:true},
        ...(isFrame
          ? [
            {name:"dataAdd",label:"Data Add",placeholder:"0",validate:numberValidator("Data Add")},
            {name:"dataSubtract",label:"Data Subtract",placeholder:"0",validate:numberValidator("Data Subtract")}
          ]
          : [
            {name:"data",label:adminT("admin.profile.modal.data","Data"),type:"number",step:"0.1",pattern:/^\d+(\.\d+)?$/,patternMessage:"Data must be a number."}
          ]),
        {name:"kdCode",label:adminT("admin.profile.modal.kd_code","KD Code")},
        {name:"customerCode",label:adminT("admin.profile.modal.customer_code","Customer Code")}
      ],
      values:{
        name:defaults.name||"",
        data:isFrame?(parts.add||""):(defaults.data||""),
        dataAdd:parts.add||"",
        dataSubtract:parts.subtract||"",
        kdCode:defaults.kdCode||"",
        customerCode:defaults.customerCode||"",
        imageValue:defaults.imageUrl||""
      }
    })
  }
  materialTabs.forEach(tab=>{
    tab.addEventListener("click",()=>{
      materialTabs.forEach(t=>t.classList.remove("active"))
      tab.classList.add("active")
      currentMaterial=tab.dataset.material||""
      categoryTabs.forEach(t=>t.classList.remove("active"))
      const stileTab=categoryTabs.find(t=>t.dataset.category==="Stile")
      if(stileTab)stileTab.classList.add("active")
      currentCategory="Stile"
      load()
    })
  })
  categoryTabs.forEach(tab=>{
    tab.addEventListener("click",()=>{
      categoryTabs.forEach(t=>t.classList.remove("active"))
      tab.classList.add("active")
      currentCategory=tab.dataset.category||""
      load()
    })
  })
  list.addEventListener("click",async(e)=>{
    const actionEl=e.target.closest("[data-action]")
    const addEl=e.target.closest(".profile-add")
    if(addEl){
      const payload=await collect()
      if(!payload)return
      let imageUrl=""
      if(payload.imageFile){
        const formData=new FormData()
        formData.append("file",payload.imageFile)
        formData.append("type","profileImage")
        const uploadRes=await window.apiFetch("/files",{method:"POST",body:formData})
        if(uploadRes&&uploadRes.ok){
          const uploaded=await uploadRes.json()
          imageUrl=uploaded.id||""
        }
      }
      const body={
        material:currentMaterial,
        category:currentCategory,
        name:payload.name||"",
        data:currentCategory==="Frame"
          ? serializeProfileDataParts(payload.dataAdd,payload.dataSubtract)
          : (payload.data||""),
        kdCode:payload.kdCode||"",
        customerCode:payload.customerCode||"",
        imageUrl
      }
      const res=await window.apiFetch("/profiles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      if(res&&res.ok)load()
      return
    }
    if(!actionEl)return
    const id=actionEl.dataset.id
    if(actionEl.dataset.action==="delete"){
      const ok=await openConfirmModal({title:"Delete Profile",content:"Delete this profile?"})
      if(!ok)return
      const res=await window.apiFetch(`/profiles/${id}`,{method:"DELETE"})
      if(res&&res.ok)load()
      return
    }
    if(actionEl.dataset.action==="edit"){
      const current=cache[id]||{}
      const payload=await collect(current)
      if(!payload)return
      let imageUrl=current.imageUrl||""
      if(payload.imageFile){
        const formData=new FormData()
        formData.append("file",payload.imageFile)
        formData.append("type","profileImage")
        const uploadRes=await window.apiFetch("/files",{method:"POST",body:formData})
        if(uploadRes&&uploadRes.ok){
          const uploaded=await uploadRes.json()
          imageUrl=uploaded.id||""
        }
      }else if(payload.imageFileClear){
        imageUrl=""
      }
      const body={
        material:currentMaterial,
        category:currentCategory,
        name:payload.name||"",
        data:currentCategory==="Frame"
          ? serializeProfileDataParts(payload.dataAdd,payload.dataSubtract)
          : (payload.data||""),
        kdCode:payload.kdCode||"",
        customerCode:payload.customerCode||"",
        imageUrl
      }
      const res=await window.apiFetch(`/profiles/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      if(res&&res.ok)load()
    }
  })
  window.addEventListener("admin-lang-changed",()=>{load()})
  load()
}

const initExcel=()=>{
  const templateLink=window.qs("[data-excel-template]")
  const templateClear=window.qs("[data-excel-template-clear]")
  const templateUpload=window.qs("[data-excel-upload]")
  const templateWrap=document.querySelector(".excel-file")
  const sectionsWrap=window.qs("[data-excel-sections]")
  const exportBtn=window.qs("[data-excel-export]")
  const importBtn=window.qs("[data-excel-import]")
  const importModal=window.qs("[data-excel-import-modal]")
  const importClose=window.qsa("[data-excel-import-close]")
  const importFile=window.qs("[data-excel-import-file]")
  const importFilename=window.qs("[data-excel-import-filename]")
  const importPreview=window.qs("[data-excel-import-preview]")
  const importError=window.qs("[data-excel-import-error]")
  const importApply=window.qs("[data-excel-import-apply]")
  if(!templateLink||!templateClear||!templateUpload||!templateWrap||!sectionsWrap)return
  let state={id:"",name:"",templateFileId:"",orderFields:[],lineFields:[]}
  const orderFields=["orderNo","customerName","companyName","date","orderReference","po","sideMark","sqmTotal"]
  const lineSections=()=>{
    return [
      {key:"order",label:adminT("admin.excel.section.order","Order Header"),fields:orderFields,isOrder:true},
      {key:"base",label:adminT("admin.excel.section.base","A. Line Basic"),fields:["room","product","style","width","height","panelConfig","sqm","mount"]},
      {key:"structure",label:adminT("admin.excel.section.structure","B. Structure"),fields:["criticalMidRail","midRail1","midRail2","split1","split2","tierOnTier1","tierOnTier2","horizontalTpost","firstPanelOpening","tiltOption","postPosition1","postPosition2","postPosition3","postPosition4","postPosition5","postPosition6","angle1","angle2","angle3","angle4","angle5","angle6"]},
      {key:"profile",label:adminT("admin.excel.section.profile","C. Profile"),fields:["louvresSize","louvresOpening","stile","tpost"]},
      {key:"frame",label:adminT("admin.excel.section.frame","D. Frame"),fields:["frameType","frameSideLeft","frameSideRight","frameSideTop","frameSideBottom","cilplatesLeft","cilplatesRight","cilplatesTop","cilplatesBottom","buildUpLeft","buildUpRight","buildUpTop","buildUpBottom","battensWidth","battensDepth","battensHeight"]},
      {key:"finish",label:adminT("admin.excel.section.finish","E. Finish"),fields:["shutterColor","hingeColor","notes"]},
      {key:"track",label:adminT("admin.excel.section.track","F. Track Option"),fields:["slidingOption","trackOption"]},
      {key:"shape",label:adminT("admin.excel.section.shape","G. Shape"),fields:["shapeType","drawingUpload"]}
    ]
  }
  const getSections=()=>lineSections()
  const currentSections=()=>getSections()
  const fieldSectionMap=new Map()
  currentSections().forEach(section=>{
    section.fields.forEach(field=>fieldSectionMap.set(field,section.key))
  })
  const allSystemFields=new Set([...orderFields,...currentSections().flatMap(s=>s.fields)])
  const buildExportPayload=()=>{
    return {
      version:"1.0",
      orderFields:state.orderFields.map(item=>({
        section:"order",
        systemName:item.systemName||"",
        startFrom:item.cell||""
      })),
      lineFields:state.lineFields.map(item=>({
        section:fieldSectionMap.get(item.systemName)||item._section||"base",
        systemName:item.systemName||"",
        startFrom:item.startCell||""
      }))
    }
  }
  const downloadJson=(data,name="excel-export-config.json")=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"})
    const url=URL.createObjectURL(blob)
    const a=document.createElement("a")
    a.href=url
    a.download=name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  let importPayload=null
  const setImportError=(message)=>{
    if(importError)importError.textContent=message||""
  }
  const setImportPreview=(data)=>{
    if(importPreview)importPreview.textContent=JSON.stringify(data||{},null,2)
  }
  const fieldDisplayName=(value)=>{
    if(value==="cilplatesLeft")return "Sill Plate Left"
    if(value==="cilplatesRight")return "Sill Plate Right"
    if(value==="cilplatesTop")return "Sill Plate Top"
    if(value==="cilplatesBottom")return "Sill Plate Bottom"
    if(value==="buildUpLeft")return "Frame Build Out Left"
    if(value==="buildUpRight")return "Frame Build Out Right"
    if(value==="buildUpTop")return "Frame Build Out Top"
    if(value==="buildUpBottom")return "Frame Build Out Bottom"
    if(/^angle[1-6]$/.test(value))return `Angle ${value.slice(-1)}`
    return value
  }
  const buildOption=(value,selected)=>{
    const option=document.createElement("option")
    option.value=value
    option.textContent=value?fieldDisplayName(value):adminT("admin.excel.select_field","Select field")
    if(selected)option.selected=true
    return option
  }
  const setCellError=(control,message)=>{
    const errorEl=control.closest(".table-cell")?.querySelector(".table-error")
    if(errorEl)errorEl.textContent=message||""
  }
  const render=()=>{
    templateLink.textContent=state.name||state.templateFileId||adminT("admin.excel.no_template","No Template")
    templateWrap.classList.toggle("invalid",!state.templateFileId)
    sectionsWrap.innerHTML=""
    const nameCounts=new Map()
    const cellCounts=new Map()
    const allNames=[...state.orderFields,...state.lineFields].map(r=>r.systemName||"").filter(Boolean)
    const allCells=[...state.orderFields.map(r=>r.cell),...state.lineFields.map(r=>r.startCell)].filter(Boolean)
    allNames.forEach(n=>nameCounts.set(n,(nameCounts.get(n)||0)+1))
    allCells.forEach(c=>cellCounts.set(c,(cellCounts.get(c)||0)+1))
    const rows=[
      ...state.orderFields.map((f,index)=>({index,systemName:f.systemName||"",cell:f.cell||"",section:"order",isOrder:true})),
      ...state.lineFields.map((f,index)=>({
        index,
        systemName:f.systemName||"",
        cell:f.startCell||"",
        section:fieldSectionMap.get(f.systemName)||f._section||"base",
        isOrder:false
      }))
    ]
    currentSections().forEach(section=>{
      const block=document.createElement("div")
      block.className="excel-section"
      block.innerHTML=`
        <div class="excel-section-header">
          <strong>${section.label}</strong>
          <button class="ghost" data-excel-add="${section.key}">${adminT("admin.excel.add_line","+ Add Line")}</button>
        </div>
        <table class="table excel-table">
          <colgroup>
            <col class="col-system">
            <col class="col-start">
            <col class="col-actions">
          </colgroup>
          <thead>
            <tr>
              <th>${adminT("admin.excel.col.system_name","SystemName")}</th>
              <th>${adminT("admin.excel.col.start_from","StartFrom")}</th>
              <th>${adminT("admin.common.actions","Actions")}</th>
            </tr>
          </thead>
          <tbody data-excel-body="${section.key}"></tbody>
        </table>
      `
      sectionsWrap.appendChild(block)
      const tbody=block.querySelector(`[data-excel-body="${section.key}"]`)
      rows.filter(r=>r.section===section.key).forEach(item=>{
        const tr=document.createElement("tr")
        tr.innerHTML=`
          <td></td>
          <td></td>
          <td class="actions">
            <span class="icon-btn" data-action="delete" data-index="${item.index}" data-kind="${item.isOrder?"order":"line"}">🗑</span>
          </td>
        `
        const select=document.createElement("select")
        select.className=`table-select${item.systemName?"":" is-invalid"}`
        select.setAttribute("data-field","systemName")
        select.setAttribute("data-index",String(item.index))
        select.setAttribute("data-kind",item.isOrder?"order":"line")
        select.appendChild(buildOption("",!item.systemName))
        if(item.systemName&&!section.fields.includes(item.systemName)){
          select.appendChild(buildOption(item.systemName,true))
        }
        section.fields.forEach(field=>{
          select.appendChild(buildOption(field,field===item.systemName))
        })
        const nameCell=document.createElement("div")
        nameCell.className="table-cell"
        nameCell.appendChild(select)
        const nameError=document.createElement("div")
        nameError.className="table-error"
        nameCell.appendChild(nameError)
        tr.children[0].appendChild(nameCell)
        const cellInput=document.createElement("input")
        cellInput.className=`table-input${item.cell?"":" is-invalid"}`
        cellInput.setAttribute("data-field","cell")
        cellInput.setAttribute("data-index",String(item.index))
        cellInput.setAttribute("data-kind",item.isOrder?"order":"line")
        cellInput.value=item.cell
        const cellCell=document.createElement("div")
        cellCell.className="table-cell"
        cellCell.appendChild(cellInput)
        const cellError=document.createElement("div")
        cellError.className="table-error"
        cellCell.appendChild(cellError)
        tr.children[1].appendChild(cellCell)
        if(!item.systemName)setCellError(select,adminT("admin.excel.required","Required."))
        else if(nameCounts.get(item.systemName)>1)setCellError(select,adminT("admin.excel.duplicate","Duplicate value."))
        if(!item.cell)setCellError(cellInput,adminT("admin.excel.required","Required."))
        else if(cellCounts.get(item.cell)>1)setCellError(cellInput,adminT("admin.excel.duplicate","Duplicate value."))
        tbody.appendChild(tr)
      })
    })
  }
  const load=async()=>{
    const res=await window.apiFetch("/excel-export-config")
    if(!res)return
    const row=await res.json()
    if(row){
      const rule=safeParse(row.ruleJson)||{}
      state={
        id:row.id||"",
        name:row.name||"",
        templateFileId:row.templateFileId||"",
        orderFields:Array.isArray(rule.orderFields)?rule.orderFields:[],
        lineFields:Array.isArray(rule.lineFields)?rule.lineFields:[]
      }
    }else{
      state={id:"",name:"",templateFileId:"",orderFields:[],lineFields:[]}
    }
    render()
  }
  const save=async()=>{
    const payload={
      name:state.name||"",
      templateFileId:state.templateFileId||"",
      ruleJson:JSON.stringify({orderFields:state.orderFields,lineFields:state.lineFields})
    }
    const res=await window.apiFetch("/excel-export-config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    if(res&&res.ok){
      const data=await res.json()
      state.id=data.id||state.id
    }
  }
  const triggerShake=(el)=>{
    el.classList.remove("shake")
    void el.offsetWidth
    el.classList.add("shake")
  }
  const validateRequired=(options={})=>{
    let ok=true
    if(!state.templateFileId){
      templateWrap.classList.add("invalid")
      if(options.shake)triggerShake(templateWrap)
      ok=false
    }else templateWrap.classList.remove("invalid")
    const nameSet=new Set()
    const cellSet=new Set()
    state.orderFields.forEach(item=>{
      if(!item.systemName||!item.cell)ok=false
      const nameKey=item.systemName
      const cellKey=item.cell
      if(nameSet.has(nameKey))ok=false
      if(cellSet.has(cellKey))ok=false
      nameSet.add(nameKey)
      cellSet.add(cellKey)
    })
    state.lineFields.forEach(item=>{
      if(!item.systemName||!item.startCell)ok=false
      const nameKey=item.systemName
      const cellKey=item.startCell
      if(nameSet.has(nameKey))ok=false
      if(cellSet.has(cellKey))ok=false
      nameSet.add(nameKey)
      cellSet.add(cellKey)
    })
    if(options.shake){
      sectionsWrap.querySelectorAll(".table-input, .table-select").forEach(input=>{
        const index=parseInt(input.dataset.index,10)
        const field=input.dataset.field
        const kind=input.dataset.kind
        const row=kind==="order"?state.orderFields[index]:state.lineFields[index]
        const value=field==="cell"?(kind==="order"?row.cell:row.startCell):row.systemName
        const cellKey=field==="cell"?(kind==="order"?row.cell:row.startCell):""
        const duplicateName=row.systemName&&[...state.orderFields,...state.lineFields].filter(r=>r.systemName===row.systemName).length>1
        const duplicateCell=cellKey&&[...state.orderFields.map(r=>r.cell),...state.lineFields.map(r=>r.startCell)].filter(v=>v===cellKey).length>1
        if(!value||duplicateName||duplicateCell){
          input.classList.add("is-invalid")
          triggerShake(input)
          if(!value)setCellError(input,adminT("admin.excel.required","Required."))
          else if(duplicateName||duplicateCell)setCellError(input,adminT("admin.excel.duplicate","Duplicate value."))
        }else{
          input.classList.remove("is-invalid")
          setCellError(input,"")
        }
      })
    }
    return ok
  }
  templateUpload.addEventListener("change",async()=>{
    const file=templateUpload.files&&templateUpload.files[0]
    if(!file)return
    const formData=new FormData()
    formData.append("file",file)
    formData.append("type","excelTemplate")
    const uploadRes=await window.apiFetch("/files",{method:"POST",body:formData})
    if(uploadRes&&uploadRes.ok){
      const uploaded=await uploadRes.json()
      state.templateFileId=uploaded.id||""
      state.name=uploaded.fileName||file.name||""
      await save()
      render()
    }
  })
  if(exportBtn){
    exportBtn.addEventListener("click",()=>{
      const payload=buildExportPayload()
      downloadJson(payload)
    })
  }
  if(importBtn&&importModal){
    importBtn.addEventListener("click",()=>{
      importModal.classList.add("is-open")
      if(importFilename)importFilename.textContent=adminT("admin.excel.no_file_selected","No file selected")
      setImportPreview({})
      setImportError("")
      importPayload=null
      if(importFile)importFile.value=""
    })
  }
  if(importClose.length&&importModal){
    importClose.forEach(btn=>{
      btn.addEventListener("click",()=>{
        importModal.classList.remove("is-open")
      })
    })
  }
  if(importFile){
    importFile.addEventListener("change",async()=>{
      const file=importFile.files&&importFile.files[0]
      if(importFilename)importFilename.textContent=file?file.name:adminT("admin.excel.no_file_selected","No file selected")
      if(!file){setImportPreview({});importPayload=null;return}
      try{
        const text=await file.text()
        const parsed=safeParse(text)
        if(!parsed){setImportError(adminT("admin.excel.invalid_json","Invalid JSON file."));setImportPreview({});importPayload=null;return}
        setImportError("")
        setImportPreview(parsed)
        importPayload=parsed
      }catch(e){
        setImportError(adminT("admin.excel.invalid_json","Invalid JSON file."))
        setImportPreview({})
        importPayload=null
      }
    })
  }
  if(importApply){
    importApply.addEventListener("click",async()=>{
      setImportError("")
      if(!importPayload){setImportError(adminT("admin.excel.select_json","Please select a JSON file."));return}
      const normalize=(items,isOrder)=>Array.isArray(items)?items.map(item=>({
        section:item.section||item.area||item.group||"",
        systemName:item.systemName||item.field||"",
        startFrom:item.startFrom||item.cell||item.startCell||""
      })).filter(item=>item.systemName):[]
      const incomingOrder=normalize(importPayload.orderFields||importPayload.order||[],true)
      const incomingLine=normalize(importPayload.lineFields||importPayload.lines||importPayload.line||[],false)
      const allIncoming=[...incomingOrder,...incomingLine]
      const unknown=allIncoming.filter(item=>!allSystemFields.has(item.systemName))
      if(unknown.length){
        setImportError(`${adminT("admin.excel.unknown_fields","Unknown fields")}: ${unknown.map(i=>i.systemName).join(", ")}`)
        return
      }
      const missingStart=allIncoming.filter(item=>!item.startFrom)
      if(missingStart.length){
        setImportError(adminT("admin.excel.missing_start_from","Missing StartFrom in some items."))
        return
      }
      const existingNames=new Set([...state.orderFields,...state.lineFields].map(r=>r.systemName).filter(Boolean))
      incomingOrder.forEach(item=>{
        if(existingNames.has(item.systemName))return
        state.orderFields.push({systemName:item.systemName,cell:item.startFrom})
        existingNames.add(item.systemName)
      })
      incomingLine.forEach(item=>{
        if(existingNames.has(item.systemName))return
        state.lineFields.push({systemName:item.systemName,startCell:item.startFrom,_section:fieldSectionMap.get(item.systemName)||item.section||"base"})
        existingNames.add(item.systemName)
      })
      await save()
      render()
      if(importModal)importModal.classList.remove("is-open")
    })
  }
  templateClear.addEventListener("click",async()=>{
    const ok=await openConfirmModal({title:adminT("admin.excel.remove_template","Remove Template"),content:adminT("admin.excel.remove_template_confirm","Remove the current template file?")})
    if(!ok)return
    state.templateFileId=""
    state.name=""
    await save()
    render()
  })
  sectionsWrap.addEventListener("click",async(e)=>{
    const btn=e.target.closest("[data-action]")
    if(btn){
      const index=parseInt(btn.dataset.index,10)
      const kind=btn.dataset.kind
      if(btn.dataset.action==="delete"){
        const ok=await openConfirmModal({title:adminT("admin.excel.delete_mapping","Delete Mapping"),content:adminT("admin.excel.delete_mapping_confirm","Delete this mapping?")})
        if(!ok)return
        if(kind==="order")state.orderFields.splice(index,1)
        else state.lineFields.splice(index,1)
        await save()
        render()
      }
      return
    }
    const addBtn=e.target.closest("[data-excel-add]")
    if(addBtn){
      if(addBtn.dataset.excelAdd==="order")state.orderFields.push({systemName:"",cell:""})
      else state.lineFields.push({systemName:"",startCell:"",_section:addBtn.dataset.excelAdd})
      await save()
      render()
    }
  })
  let saveTimer=null
  sectionsWrap.addEventListener("input",(e)=>{
    const input=e.target.closest(".table-input")
    const select=e.target.closest(".table-select")
    const control=input||select
    if(!control)return
    const index=parseInt(control.dataset.index,10)
    const field=control.dataset.field
    const kind=control.dataset.kind
    const list=kind==="order"?state.orderFields:state.lineFields
    const target=list[index]
    if(!target)return
    if(field==="systemName"){
      target.systemName=control.value
      if(kind!=="order")target._section=fieldSectionMap.get(control.value)||target._section
    }
    if(field==="cell"){
      if(kind==="order")target.cell=control.value
      else target.startCell=control.value
    }
    const duplicateName=target.systemName&&[...state.orderFields,...state.lineFields].filter(r=>r.systemName===target.systemName).length>1
    const allCells=[...state.orderFields.map(r=>r.cell),...state.lineFields.map(r=>r.startCell)]
    const currentCell=kind==="order"?target.cell:target.startCell
    const duplicateCell=currentCell&&allCells.filter(v=>v===currentCell).length>1
    control.classList.toggle("is-invalid",!control.value.trim())
    if(duplicateName||duplicateCell){
      control.classList.add("is-invalid")
      triggerShake(control)
      setCellError(control,adminT("admin.excel.duplicate","Duplicate value."))
    }else if(!control.value.trim()){
      setCellError(control,adminT("admin.excel.required","Required."))
    }else{
      setCellError(control,"")
    }
    if(saveTimer)clearTimeout(saveTimer)
    saveTimer=setTimeout(async()=>{
      await save()
      render()
    },600)
  })
  document.querySelectorAll("a.nav-item").forEach(link=>{
    link.addEventListener("click",(e)=>{
      if(!validateRequired({shake:true}))e.preventDefault()
    })
  })
  window.addEventListener("beforeunload",(e)=>{
    if(!validateRequired({shake:true})){
      e.preventDefault()
      e.returnValue=""
    }
  })
  window.addEventListener("admin-lang-changed",()=>{render()})
  load()
}
