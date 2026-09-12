const qs=selector=>document.querySelector(selector)
const qsa=selector=>Array.from(document.querySelectorAll(selector))
const apiFetch=(url,options)=>window.apiFetch?window.apiFetch(url,options):fetch(url,options)
const adminProtoT=(key,fallback="")=>{
  if(window.adminI18n&&typeof window.adminI18n.t==="function")return window.adminI18n.t(key,fallback)
  return fallback||key
}

const companySelect=qs("[data-company-select]")
const saveBtn=qs("[data-config-save]")
const shutterInput=qs("[data-shutter-colors]")
const hingeInput=qs("[data-hinge-colors]")
const colorProductSelect=qs("[data-color-product-select]")
const productSelect=qs("[data-product-select]")
const styleSelect=qs("[data-style-select]")
const tiltInput=qs("[data-tilt-options]")
const louverOpeningConfigRow=qs("[data-louver-opening-config]")
const profileGroups=qs("[data-profile-groups]")
const categoryTabs=qsa("[data-category]")
const materialWrap=qs(".profile-materials")
const getMaterialLabel=(code)=>{
  if(window.materialCatalog&&typeof window.materialCatalog.getLabelSync==="function"){
    return window.materialCatalog.getLabelSync(code)
  }
  return String(code||"")
}
const DEFAULT_PROTOTYPE_MATERIAL_OPTIONS=[
  {code:"Hollow",label:"LARK™ Lightweight Shutters"},
  {code:"Coated Paulownia",label:"Coated Paulownia"},
  {code:"Basswood",label:"CARVER™ Wood Shutters"},
  {code:"PVC",label:"TENET™ Composite Shutters"},
  {code:"Sunnex Poly",label:"Sunnex Poly"},
  {code:"Sunnex Wood",label:"Sunnex Wood"},
  {code:"Sunnex Hollow",label:"Sunnex Hollow"}
]

let currentMaterial="Hollow"
let currentCategory=categoryTabs.find(t=>t.classList.contains("active"))?.dataset.category||"Stile"
let currentColorProduct=""
let colorDraftDirty=false
let colorRowId=""
let useAllProfiles=false
const state={
  companyId:"",
  productList:[],
  styleList:[],
  profileIds:[],
  profileMountMap:{},
  profileAreaMountMap:{},
  colorMap:{default:{shutter:[],hinge:[],tilt:[],louverOpening:"Both"},byProduct:{}}
}
const AVAILABLE_MOUNTS=["IM","OM","N.W.F"]
const AREA_RULES=["add","subtract"]
const LOUVER_OPENING_CONFIG_OPTIONS=["None","1way","2way","Both"]
const normalizeMountList=(value)=>Array.from(new Set((Array.isArray(value)?value:[]).map(v=>String(v||"").trim().toUpperCase()).filter(v=>AVAILABLE_MOUNTS.includes(v))))
const normalizeAreaRule=(value)=>{
  const raw=String(value||"").trim().toLowerCase()
  return AREA_RULES.includes(raw)?raw:""
}
const normalizeAreaRuleMap=(value)=>{
  if(!value||typeof value!=="object"||Array.isArray(value))return {}
  const result={}
  Object.keys(value).forEach(profileId=>{
    const current=value[profileId]
    if(Array.isArray(current)){
      const next={}
      current.map(v=>String(v||"").trim().toUpperCase()).filter(v=>AVAILABLE_MOUNTS.includes(v)).forEach(mount=>{
        next[mount]="add"
      })
      result[profileId]=next
      return
    }
    if(!current||typeof current!=="object")return
    const next={}
    Object.keys(current).forEach(mountKey=>{
      const mount=String(mountKey||"").trim().toUpperCase()
      if(!AVAILABLE_MOUNTS.includes(mount))return
      const rule=normalizeAreaRule(current[mountKey])
      if(rule)next[mount]=rule
    })
    result[profileId]=next
  })
  return result
}
const getProfileAreaRule=(profileId,mount)=>normalizeAreaRule(state.profileAreaMountMap&&state.profileAreaMountMap[profileId]&&state.profileAreaMountMap[profileId][mount])
const setProfileAreaRule=(profileId,mount,rule)=>{
  const normalizedRule=normalizeAreaRule(rule)
  const current=normalizeAreaRuleMap({temp:state.profileAreaMountMap&&state.profileAreaMountMap[profileId]||{}}).temp||{}
  const next={...current}
  if(normalizedRule)next[mount]=normalizedRule
  else delete next[mount]
  state.profileAreaMountMap[profileId]=next
}
const parseProfileDataParts=(value)=>{
  const raw=String(value||"").trim()
  if(!raw)return {add:"",subtract:""}
  if(!raw.includes("/"))return {add:raw,subtract:""}
  const [add="",subtract=""]=raw.split("/",2)
  return {add:String(add||"").trim(),subtract:String(subtract||"").trim()}
}
const formatProfileDataDisplay=(value,isFrame)=>{
  const parts=parseProfileDataParts(value)
  if(!isFrame)return parts.add||String(value||"")
  return `+ ${parts.add||"-"} / - ${parts.subtract||"-"}`
}
const normalizeLouverOpeningConfig=(value)=>{
  const raw=String(value||"").trim().toLowerCase()
  if(raw==="none")return "None"
  if(raw==="1way")return "1way"
  if(raw==="2way")return "2way"
  return "Both"
}

const parseColorGroups=(value)=>{
  const raw=String(value||"").trim()
  if(!/shutter\s*:/i.test(raw)&&!/hinge\s*:/i.test(raw)){
    return {shutter:raw,hinge:raw}
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
  return {shutter,hinge}
}
const formatColorGroups=(shutter,hinge)=>`shutter:${String(shutter||"").trim()}|hinge:${String(hinge||"").trim()}`
const toColorList=(value)=>String(value||"").split(/[\/,]/).map(v=>v.trim()).filter(Boolean)
const toTiltList=(value)=>String(value||"").split("/").map(v=>v.trim()).filter(Boolean)
const pairToInput=(pair)=>Array.isArray(pair)?pair.join("/"):String(pair||"")
const normalizeColorPair=(pair)=>{
  const source=pair&&typeof pair==="object"?pair:{}
  return {
    shutter:Array.isArray(source.shutter)?source.shutter:toColorList(source.shutter),
    hinge:Array.isArray(source.hinge)?source.hinge:toColorList(source.hinge),
    tilt:Array.isArray(source.tilt)?source.tilt:toTiltList(source.tilt),
    louverOpening:normalizeLouverOpeningConfig(source.louverOpening)
  }
}
const setLouverOpeningConfigValue=(value)=>{
  if(!louverOpeningConfigRow)return
  const normalized=normalizeLouverOpeningConfig(value)
  const target=LOUVER_OPENING_CONFIG_OPTIONS.includes(normalized)?normalized:"Both"
  louverOpeningConfigRow.querySelectorAll("[data-value]").forEach(btn=>{
    btn.classList.toggle("active",(btn.dataset.value||"")===target)
  })
}
const getLouverOpeningConfigValue=()=>{
  if(!louverOpeningConfigRow)return "Both"
  const active=louverOpeningConfigRow.querySelector(".single-choice.active")
  return normalizeLouverOpeningConfig(active&&active.dataset&&active.dataset.value?active.dataset.value:"Both")
}
const parseLegacyColorList=(value)=>{
  const raw=String(value||"").trim()
  if(!raw)return {shutter:[],hinge:[]}
  if(!/shutter\s*:/i.test(raw)&&!/hinge\s*:/i.test(raw)){
    const list=toColorList(raw)
    return {shutter:list,hinge:list}
  }
  let shutterRaw=""
  let hingeRaw=""
  raw.split(/\n|\|/).forEach(part=>{
    const items=part.split(":")
    if(items.length<2)return
    const key=items.shift().trim().toLowerCase()
    const list=items.join(":").trim()
    if(key==="shutter")shutterRaw=list
    if(key==="hinge")hingeRaw=list
  })
  return {shutter:toColorList(shutterRaw),hinge:toColorList(hingeRaw)}
}
const readCurrentOptionEditor=()=>{
  if(!currentColorProduct)return
  if(!state.colorMap.byProduct[currentColorProduct])state.colorMap.byProduct[currentColorProduct]={shutter:[],hinge:[],tilt:[],louverOpening:"Both"}
  state.colorMap.byProduct[currentColorProduct]={
    shutter:toColorList(shutterInput?shutterInput.value:""),
    hinge:toColorList(hingeInput?hingeInput.value:""),
    tilt:toTiltList(tiltInput?tiltInput.value:""),
    louverOpening:getLouverOpeningConfigValue()
  }
}
const renderCurrentColorEditor=()=>{
  if(!shutterInput||!hingeInput||!tiltInput)return
  if(!currentColorProduct){
    shutterInput.value=""
    hingeInput.value=""
    tiltInput.value=""
    setLouverOpeningConfigValue("Both")
    shutterInput.disabled=true
    hingeInput.disabled=true
    tiltInput.disabled=true
    if(louverOpeningConfigRow){
      louverOpeningConfigRow.querySelectorAll("[data-value]").forEach(btn=>{btn.disabled=true})
    }
    return
  }
  shutterInput.disabled=false
  hingeInput.disabled=false
  tiltInput.disabled=false
  if(louverOpeningConfigRow){
    louverOpeningConfigRow.querySelectorAll("[data-value]").forEach(btn=>{btn.disabled=false})
  }
  const productPair=normalizeColorPair(state.colorMap.byProduct[currentColorProduct]||{shutter:[],hinge:[],tilt:[],louverOpening:"Both"})
  const defaultPair=normalizeColorPair(state.colorMap.default||{shutter:[],hinge:[],tilt:[],louverOpening:"Both"})
  shutterInput.value=pairToInput(productPair.shutter)
  hingeInput.value=pairToInput(productPair.hinge.length?productPair.hinge:defaultPair.hinge)
  tiltInput.value=pairToInput(productPair.tilt.length?productPair.tilt:defaultPair.tilt)
  setLouverOpeningConfigValue(productPair.louverOpening||defaultPair.louverOpening||"Both")
  colorDraftDirty=false
}
const setCurrentColorProduct=(next,options={})=>{
  const silent=!!options.silent
  const force=!!options.force
  const forceRender=!!options.forceRender
  if(!next){
    currentColorProduct=""
    renderCurrentColorEditor()
    return true
  }
  if(currentColorProduct===next){
    if(forceRender)renderCurrentColorEditor()
    return true
  }
  if(currentColorProduct&&colorDraftDirty&&!silent&&!force){
    const ok=window.confirm(adminProtoT("admin.config_proto.unsaved_color_confirm","Unsaved color changes will be discarded. Continue?"))
    if(!ok)return false
  }
  currentColorProduct=next
  if(colorProductSelect)colorProductSelect.value=next
  renderCurrentColorEditor()
  return true
}
const syncColorProductOptions=(options={})=>{
  const silent=!!options.silent
  const forceRender=!!options.forceRender
  if(!colorProductSelect)return
  const selectedProducts=productPicker?productPicker.getSelected():[]
  colorProductSelect.innerHTML=""
  selectedProducts.forEach(code=>{
    const option=document.createElement("option")
    option.value=code
    option.textContent=getMaterialLabel(code)
    colorProductSelect.appendChild(option)
  })
  if(selectedProducts.length===0){
    colorProductSelect.disabled=true
    setCurrentColorProduct("",{silent:true,force:true})
    return
  }
  colorProductSelect.disabled=false
  const next=selectedProducts[0]
  const switched=setCurrentColorProduct(next,{silent,forceRender})
  if(!switched){
    const fallback=selectedProducts.includes(currentColorProduct)?currentColorProduct:next
    setCurrentColorProduct(fallback,{silent:true,force:true,forceRender:true})
  }
}
const loadPrototypeMaterialOptions=async()=>{
  const fallback=window.materialCatalog&&typeof window.materialCatalog.getOptionsSync==="function"
    ? window.materialCatalog.getOptionsSync()
    : DEFAULT_PROTOTYPE_MATERIAL_OPTIONS.map(item=>({...item}))
  if(window.materialCatalog&&typeof window.materialCatalog.load==="function"){
    const loaded=await window.materialCatalog.load()
    return Array.isArray(loaded)&&loaded.length?loaded:fallback
  }
  return fallback
}
const renderMaterialTabs=(options)=>{
  if(!materialWrap)return
  const preferred=materialWrap.querySelector(".profile-pill.active")?.dataset.material||""
  materialWrap.innerHTML=""
  options.forEach((item,index)=>{
    const btn=document.createElement("button")
    btn.className=`profile-pill${(preferred?preferred===item.code:index===0)?" active":""}`
    btn.dataset.material=item.code
    btn.textContent=item.label||item.code
    materialWrap.appendChild(btn)
  })
}
const renderProductOptions=(options)=>{
  if(!productSelect)return
  const panel=productSelect.querySelector(".multi-select-panel")
  if(!panel)return
  const checked=new Set(Array.from(panel.querySelectorAll("input[type='checkbox']:checked")).map(input=>input.value))
  panel.innerHTML=""
  options.forEach((item,index)=>{
    const label=document.createElement("label")
    label.className="multi-select-item"
    const input=document.createElement("input")
    input.type="checkbox"
    input.value=item.code
    input.checked=checked.size?checked.has(item.code):index===0
    label.appendChild(input)
    label.appendChild(document.createTextNode(item.label||item.code))
    panel.appendChild(label)
  })
}

const setupMultiSelect=(select)=>{
  if(!select)return null
  const trigger=select.querySelector(".multi-select-trigger")
  const placeholder=select.querySelector("[data-placeholder]")
  const getItems=()=>Array.from(select.querySelectorAll("input[type='checkbox']"))
  const updateLabel=()=>{
    if(!placeholder)return
    const active=getItems().filter(i=>i.checked).map(i=>i.value)
    placeholder.textContent=active.length?active.map(getMaterialLabel).join(", "):adminProtoT("admin.config_proto.none_selected","None selected")
  }
  if(trigger&&select.dataset.multiSelectBound!=="1"){
    trigger.addEventListener("click",()=>{
      document.querySelectorAll(".multi-select.open").forEach(open=>{
        if(open!==select)open.classList.remove("open")
      })
      select.classList.toggle("open")
    })
  }
  if(select.dataset.multiSelectBound!=="1"){
    select.addEventListener("change",e=>{
      if(e.target&&e.target.matches("input[type='checkbox']")){
        updateLabel()
        if(select===productSelect){
          syncColorProductOptions()
        }
      }
    })
    document.addEventListener("click",e=>{
      if(!select.contains(e.target))select.classList.remove("open")
    })
    select.dataset.multiSelectBound="1"
  }
  updateLabel()
  return {
    getSelected:()=>getItems().filter(i=>i.checked).map(i=>i.value),
    setSelected:(values)=>{
      getItems().forEach(item=>{
        item.checked=values.includes(item.value)
      })
      updateLabel()
    },
    getAll:()=>getItems().map(i=>i.value)
  }
}

let productPicker=null
let stylePicker=null

const setActiveTab=(list,el,attr)=>{
  list.forEach(btn=>btn.classList.toggle("active",btn===el))
  if(el&&el.dataset[attr]) return el.dataset[attr]
  return ""
}

categoryTabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    currentCategory=setActiveTab(categoryTabs,tab,"category")||currentCategory
    loadProfiles()
  })
})
const initMaterialBindings=async()=>{
  const options=await loadPrototypeMaterialOptions()
  renderMaterialTabs(options)
  renderProductOptions(options)
  productPicker=setupMultiSelect(productSelect)
  stylePicker=setupMultiSelect(styleSelect)
  const materialTabs=qsa(".profile-materials [data-material]")
  currentMaterial=materialTabs.find(t=>t.classList.contains("active"))?.dataset.material||options[0]?.code||"Hollow"
  materialTabs.forEach(tab=>{
    tab.addEventListener("click",()=>{
      currentMaterial=setActiveTab(materialTabs,tab,"material")||currentMaterial
      loadProfiles()
    })
  })
  syncColorProductOptions({silent:true})
}

const imageCache=new Map()
const loadImageUrl=async(imageUrl)=>{
  if(!imageUrl)return ""
  if(imageCache.has(imageUrl))return imageCache.get(imageUrl)
  if(/^https?:\/\//.test(imageUrl)){
    imageCache.set(imageUrl,imageUrl)
    return imageUrl
  }
  const path=imageUrl.startsWith("/files/")?imageUrl:`/files/${imageUrl}`
  const res=await apiFetch(path)
  if(res&&res.ok){
    const blob=await res.blob()
    const url=URL.createObjectURL(blob)
    imageCache.set(imageUrl,url)
    return url
  }
  return imageUrl.startsWith("/files/")?imageUrl:`/files/${imageUrl}`
}

const renderProfiles=(rows)=>{
  if(!profileGroups)return
  profileGroups.innerHTML=""
  if(rows.length===0){
    profileGroups.innerHTML=`<div class="profile-empty">${adminProtoT("admin.config_proto.profile_empty","No profiles")}</div>`
    return
  }
  if(useAllProfiles&&state.profileIds.length===0&&currentCategory!=="Frame"){
    state.profileIds=rows.map(row=>row.id)
  }
  const selected=new Set(state.profileIds)
  const isFrameCategory=currentCategory==="Frame"
  if(!state.profileMountMap||typeof state.profileMountMap!=="object")state.profileMountMap={}
  state.profileAreaMountMap=normalizeAreaRuleMap(state.profileAreaMountMap)
  if(isFrameCategory){
    rows.forEach(row=>{
      const mounts=normalizeMountList(state.profileMountMap[row.id])
      const areaRules=normalizeAreaRuleMap({temp:state.profileAreaMountMap[row.id]}).temp||{}
      state.profileMountMap[row.id]=mounts
      state.profileAreaMountMap[row.id]=areaRules
      if(mounts.length)selected.add(row.id)
      else selected.delete(row.id)
    })
    state.profileIds=Array.from(selected)
  }
  const syncSelectedFromMountMap=(id)=>{
    const mounts=normalizeMountList(state.profileMountMap[id])
    state.profileMountMap[id]=mounts
    if(mounts.length)selected.add(id)
    else selected.delete(id)
    state.profileIds=Array.from(selected)
  }
  const group=document.createElement("div")
  group.className="profile-group"
  const mountLegend=isFrameCategory?`
    <div class="profile-mount-legend">
      <span class="profile-mount-legend-item is-visible">${adminProtoT("admin.config_proto.mount_legend_visible","Check to show mount")}</span>
      <span class="profile-mount-legend-item is-area">${adminProtoT("admin.config_proto.mount_legend_area","Optional area rule: + add / - deduct")}</span>
    </div>
  `:""
  group.innerHTML=`<div class="profile-group-head"><div class="profile-group-title">${adminProtoT("admin.config_proto.profile_group_title","Profiles")}</div>${mountLegend}</div><div class="profile-group-grid"></div>`
  const grid=group.querySelector(".profile-group-grid")
  rows.forEach(row=>{
    const card=document.createElement("div")
    card.className="profile-card selectable"
    card.dataset.id=row.id||""
    const mountChecks=isFrameCategory?`
        <div class="profile-mount-rules">
          ${AVAILABLE_MOUNTS.map(mount=>`
            <div class="profile-mount-rule-col" data-mount-col="${mount}">
              <label class="profile-mount-visibility">
                <input type="checkbox" data-mount="${mount}">
                <span>${mount}</span>
              </label>
              <div class="profile-area-rule-stack">
                <button type="button" class="profile-area-rule-btn" data-area-mount="${mount}" data-area-rule="add">+</button>
                <button type="button" class="profile-area-rule-btn" data-area-mount="${mount}" data-area-rule="subtract">-</button>
              </div>
            </div>
          `).join("")}
        </div>
    `:`
        <div class="profile-check"><input type="checkbox"></div>
    `
    card.innerHTML=`
      ${isFrameCategory?`<div class="profile-card-toolbar">${mountChecks}</div>`:""}
      <div class="profile-image">${adminProtoT("admin.common.no_image","No Image")}</div>
      <div class="profile-body">
        ${isFrameCategory?"":mountChecks}
        <strong>${adminProtoT("admin.profile.card.name","Name")}: ${row.name||""}</strong>
        <div class="profile-meta">
          <span>${adminProtoT("admin.profile.card.kd_code","KD Code")}: ${row.kdCode||""}</span>
          <span>${adminProtoT("admin.profile.card.customer_code","Customer Code")}: ${row.customerCode||""}</span>
          <span>${adminProtoT("admin.profile.card.data","Data")}: ${formatProfileDataDisplay(row.data||"",isFrameCategory)}</span>
        </div>
      </div>
    `
    const input=card.querySelector(".profile-check input")
    const update=()=>{
      if(isFrameCategory){
        const mounts=normalizeMountList(state.profileMountMap[row.id])
        const areaRules=normalizeAreaRuleMap({temp:state.profileAreaMountMap[row.id]}).temp||{}
        AVAILABLE_MOUNTS.forEach(mount=>{
          const mountInput=card.querySelector(`[data-mount="${mount}"]`)
          const isVisible=mounts.includes(mount)
          if(mountInput)mountInput.checked=isVisible
          const col=card.querySelector(`[data-mount-col="${mount}"]`)
          if(col)col.classList.toggle("is-visible",isVisible)
          card.querySelectorAll(`[data-area-mount="${mount}"][data-area-rule]`).forEach(btn=>{
            const rule=String(btn.dataset.areaRule||"").trim().toLowerCase()
            btn.classList.toggle("active",isVisible&&areaRules[mount]===rule)
            btn.disabled=!isVisible
          })
        })
        card.querySelectorAll("[data-area-mount][data-area-rule]").forEach(btn=>{
          const mount=String(btn.dataset.areaMount||"").trim().toUpperCase()
          if(!mounts.includes(mount))btn.classList.remove("active")
        })
        card.classList.toggle("is-selected",mounts.length>0)
        card.classList.toggle("is-visible-selected",mounts.length>0)
        card.classList.toggle("is-area-selected",Object.keys(areaRules).length>0)
        return
      }
      const checked=selected.has(row.id)
      if(input)input.checked=checked
      card.classList.toggle("is-selected",checked)
    }
    update()
    const preview=card.querySelector(".profile-image")
    if(row.imageUrl){
      loadImageUrl(row.imageUrl).then(url=>{
        if(!url||!preview)return
        preview.textContent=""
        const img=document.createElement("img")
        img.src=url
        img.alt=row.name||""
        preview.appendChild(img)
      })
    }
    if(isFrameCategory){
      card.querySelectorAll("[data-mount]").forEach(mountInput=>{
        mountInput.addEventListener("change",()=>{
          const current=normalizeMountList(state.profileMountMap[row.id])
          const mount=mountInput.dataset.mount||""
          const next=mountInput.checked?Array.from(new Set([...current,mount])):current.filter(v=>v!==mount)
          state.profileMountMap[row.id]=next
          if(!mountInput.checked)setProfileAreaRule(row.id,mount,"")
          syncSelectedFromMountMap(row.id)
          update()
        })
      })
      card.querySelectorAll("[data-area-mount][data-area-rule]").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const mount=String(btn.dataset.areaMount||"").trim().toUpperCase()
          const mounts=normalizeMountList(state.profileMountMap[row.id])
          if(!mounts.includes(mount))return
          const rule=normalizeAreaRule(btn.dataset.areaRule||"")
          const current=getProfileAreaRule(row.id,mount)
          setProfileAreaRule(row.id,mount,current===rule?"":rule)
          update()
        })
      })
    }else{
      card.addEventListener("click",e=>{
        if(e.target&&e.target.tagName==="INPUT"){
          if(e.target.checked)selected.add(row.id)
          else selected.delete(row.id)
        }else{
          if(selected.has(row.id))selected.delete(row.id)
          else selected.add(row.id)
        }
        state.profileIds=Array.from(selected)
        update()
      })
    }
    grid.appendChild(card)
  })
  profileGroups.appendChild(group)
}

const loadProfiles=async()=>{
  if(!state.companyId)return
  const res=await apiFetch(`/profiles?material=${encodeURIComponent(currentMaterial)}&category=${encodeURIComponent(currentCategory)}`)
  if(!res||!res.ok)return
  const rows=await res.json()
  renderProfiles(Array.isArray(rows)?rows:[])
}

const fetchJsonNoStore=async(url)=>{
  let res=await apiFetch(url,{cache:"no-store"})
  if((!res||!res.ok)&&res&&res.status===304){
    const sep=url.includes("?")?"&":"?"
    res=await apiFetch(`${url}${sep}_ts=${Date.now()}`,{cache:"no-store"})
  }
  if(!res||!res.ok)return null
  try{
    return await res.json()
  }catch(e){
    const sep=url.includes("?")?"&":"?"
    const retry=await apiFetch(`${url}${sep}_ts=${Date.now()}&retry=1`,{cache:"no-store"})
    if(!retry||!retry.ok)return null
    try{
      return await retry.json()
    }catch(err){
      return null
    }
  }
}

const loadCompanies=async()=>{
  let rows=await fetchJsonNoStore("/companies")
  rows=Array.isArray(rows)?rows:[]
  if(rows.length===0){
    const current=await fetchJsonNoStore("/company/current")
    if(current&&current.id)rows=[current]
  }
  if(!companySelect)return
  companySelect.innerHTML=""
  rows.forEach(row=>{
    const option=document.createElement("option")
    option.value=row.id
    option.textContent=row.name||row.id
    companySelect.appendChild(option)
  })
  if(rows.length===0){
    const option=document.createElement("option")
    option.value=""
    option.textContent=adminProtoT("admin.config_proto.company.select","Select Company")
    companySelect.appendChild(option)
    companySelect.value=""
    state.companyId=""
    return
  }
  if(rows[0]){
    companySelect.value=rows[0].id
    state.companyId=rows[0].id
  }
}

const applyCompanyConfig=async(companyId)=>{
  if(!companyId)return
  const res=await apiFetch(`/company-config?companyId=${encodeURIComponent(companyId)}`)
  if(!res||!res.ok)return
  const row=await res.json()
  const config=row||{productList:[],styleList:[],profileIds:[],profileMountMap:{},profileAreaMountMap:{}}
  useAllProfiles=config.profileIds.length===0
  state.productList=config.productList||[]
  state.styleList=config.styleList||[]
  state.profileIds=config.profileIds||[]
  state.profileMountMap=config.profileMountMap&&typeof config.profileMountMap==="object"?config.profileMountMap:{}
  state.profileAreaMountMap=normalizeAreaRuleMap(config.profileAreaMountMap)
  if(productPicker){
    const list=state.productList.length?state.productList:productPicker.getAll()
    productPicker.setSelected(list)
    syncColorProductOptions({silent:true})
  }
  if(stylePicker){
    const list=state.styleList.length?state.styleList:stylePicker.getAll()
    stylePicker.setSelected(list)
  }
  await loadProfiles()
}

const loadColors=async(companyId)=>{
  let res=await apiFetch(`/colors?companyId=${encodeURIComponent(companyId)}`,{cache:"no-store"})
  if((!res||!res.ok)&&res&&res.status===304){
    res=await apiFetch(`/colors?companyId=${encodeURIComponent(companyId)}&_ts=${Date.now()}`,{cache:"no-store"})
  }
  if(!res||!res.ok)return
  let rows=[]
  try{
    rows=await res.json()
  }catch(e){
    return
  }
  const row=Array.isArray(rows)?rows[0]:rows
  colorRowId=row&&row.id?row.id:""
  let parsedMap=null
  try{
    parsedMap=row&&row.colorMapJson?JSON.parse(row.colorMapJson):null
  }catch(e){
    parsedMap=null
  }
  const fallback=parseLegacyColorList(row&&row.colorList)
  const byProductSource=parsedMap&&parsedMap.byProduct&&typeof parsedMap.byProduct==="object"?parsedMap.byProduct:{}
  const byProduct={}
  Object.keys(byProductSource).forEach(code=>{
    byProduct[code]=normalizeColorPair(byProductSource[code])
  })
  state.colorMap={
    default:normalizeColorPair(parsedMap&&parsedMap.default?parsedMap.default:fallback),
    byProduct
  }
  syncColorProductOptions({silent:true,forceRender:true})
}

const syncCompany=async()=>{
  const companyId=companySelect?companySelect.value:""
  if(!companyId)return
  state.companyId=companyId
  await applyCompanyConfig(companyId)
  await loadColors(companyId)
}

if(companySelect){
  companySelect.addEventListener("change",()=>{
    syncCompany()
  })
}
if(colorProductSelect){
  colorProductSelect.addEventListener("change",()=>{
    const target=colorProductSelect.value||""
    const switched=setCurrentColorProduct(target)
    if(!switched)colorProductSelect.value=currentColorProduct||""
  })
}
if(shutterInput){
  shutterInput.addEventListener("input",()=>{colorDraftDirty=true})
}
if(hingeInput){
  hingeInput.addEventListener("input",()=>{colorDraftDirty=true})
}
if(tiltInput){
  tiltInput.addEventListener("input",()=>{colorDraftDirty=true})
}
if(louverOpeningConfigRow){
  louverOpeningConfigRow.addEventListener("click",e=>{
    const btn=e.target&&e.target.closest?e.target.closest("[data-value]"):null
    if(!btn||!louverOpeningConfigRow.contains(btn)||btn.disabled)return
    setLouverOpeningConfigValue(btn.dataset.value||"Both")
    colorDraftDirty=true
  })
}

if(saveBtn){
  saveBtn.addEventListener("click",async()=>{
    if(!state.companyId)return
    const setButtonState=(stateLabel,labels={})=>{
      if(!saveBtn.dataset.defaultText)saveBtn.dataset.defaultText=saveBtn.textContent.trim()
      if(stateLabel==="loading"){
        saveBtn.textContent=labels.loading||adminProtoT("admin.config_proto.saving","Saving...")
        saveBtn.classList.add("is-loading")
        saveBtn.classList.remove("is-success")
        saveBtn.disabled=true
        return
      }
      if(stateLabel==="success"){
        saveBtn.textContent=labels.success||adminProtoT("admin.config_proto.saved","Saved ✓")
        saveBtn.classList.remove("is-loading")
        saveBtn.classList.add("is-success")
        saveBtn.disabled=true
        setTimeout(()=>{
          saveBtn.textContent=saveBtn.dataset.defaultText||""
          saveBtn.classList.remove("is-success")
          saveBtn.disabled=false
        },1400)
        return
      }
      saveBtn.textContent=saveBtn.dataset.defaultText||""
      saveBtn.classList.remove("is-loading","is-success")
      saveBtn.disabled=false
    }
    setButtonState("loading")
    readCurrentOptionEditor()
    const selectedProducts=productPicker?productPicker.getSelected():[]
    const payload={
      productList:selectedProducts,
      styleList:stylePicker?stylePicker.getSelected():[],
      profileIds:state.profileIds||[],
      profileMountMap:state.profileMountMap||{},
      profileAreaMountMap:state.profileAreaMountMap||{}
    }
    let ok=true
    try{
      const configRes=await apiFetch(`/company-config/${encodeURIComponent(state.companyId)}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      })
      ok=!!(configRes&&configRes.ok)
    }catch(e){
      ok=false
    }
    Object.keys(state.colorMap.byProduct||{}).forEach(code=>{
      if(!selectedProducts.includes(code))delete state.colorMap.byProduct[code]
    })
    const first=selectedProducts[0]||""
    const firstPair=first&&state.colorMap.byProduct[first]
      ? normalizeColorPair(state.colorMap.byProduct[first])
      : normalizeColorPair(state.colorMap.default)
    const colorBody={
      companyId:state.companyId,
      colorList:formatColorGroups(pairToInput(firstPair.shutter),pairToInput(firstPair.hinge)),
      colorMap:state.colorMap
    }
    try{
      let colorRes=null
      if(colorRowId){
        colorRes=await apiFetch(`/colors/${colorRowId}`,{
          method:"PUT",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(colorBody)
        })
      }else{
        colorRes=await apiFetch("/colors",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(colorBody)
        })
      }
      ok=ok&&!!(colorRes&&colorRes.ok)
      if(colorRes&&colorRes.ok){
        if(!colorRowId){
          let colorData=null
          try{
            colorData=await colorRes.json()
          }catch(e){
            colorData=null
          }
          if(colorData&&colorData.id)colorRowId=colorData.id
        }
        await loadColors(state.companyId)
      }
    }catch(e){
      ok=false
    }
    if(ok)setButtonState("success",{success:adminProtoT("admin.config_proto.saved","Saved ✓")})
    else setButtonState("default")
  })
}

window.addEventListener("admin-lang-changed",()=>{
  if(productPicker)productPicker.setSelected(productPicker.getSelected())
  if(stylePicker)stylePicker.setSelected(stylePicker.getSelected())
  loadProfiles()
})

loadCompanies().then(async()=>{
  await initMaterialBindings()
  await syncCompany()
})
