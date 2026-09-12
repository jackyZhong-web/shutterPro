window.cartInit=()=>{
  const params=new URLSearchParams(location.search)
  if(params.get("embed")==="1")document.body.classList.add("cart-embed")
  const list=window.qs("[data-cart-lines]")
  const empty=window.qs("[data-cart-empty]")
  const sqmEl=window.qs("[data-cart-sqm]")
  const areaLabelEl=window.qs("[data-area-label]")
  const companyEl=window.qs("[data-cart-company]")
  const orderNoEl=window.qs("[data-cart-orderno]")
  const dateEl=window.qs("[data-cart-date]")
  const refInput=window.qs("[data-order-reference]")
  const poInput=window.qs("[data-order-po]")
  const sideMarkInput=window.qs("[data-order-side-mark]")
  const metaError=window.qs("[data-cart-meta-error]")
  const saveBtn=window.qs("[data-cart-save]")
  const sendBtn=window.qs("[data-cart-send]")
  let cache={}
  let hasItems=false
  const units=window.units||{}
  const getUnit=()=>units.getUnit?units.getUnit():"mm"
  const lengthLabel=()=>units.unitLabel?units.unitLabel(getUnit()):"mm"
  const formatLength=(mm)=>units.formatLength?units.formatLength(mm,getUnit()):(mm||"")
  const areaLabel=()=>units.areaLabel?units.areaLabel(getUnit()):"㎡"
  const formatArea=(sqm)=>units.formatAreaFromSqm?units.formatAreaFromSqm(sqm,getUnit()):(sqm||"0.00")
  const updateAreaLabel=()=>{
    if(areaLabelEl)areaLabelEl.textContent=getUnit()==="inch"?"Area:":"SQM:"
  }
  const shakeElement=(el)=>{
    if(!el)return
    el.classList.remove("shake")
    void el.offsetWidth
    el.classList.add("shake")
    setTimeout(()=>el.classList.remove("shake"),400)
  }
  const clearMetaError=()=>{
    if(metaError)metaError.textContent=""
    ;[poInput,sideMarkInput].forEach(input=>{ if(input)input.classList.remove("input-error") })
  }
  const getOrderMeta=()=>{
    const orderReference=refInput?String(refInput.value||"").trim():""
    const po=poInput?String(poInput.value||"").trim():""
    const sideMark=sideMarkInput?String(sideMarkInput.value||"").trim():""
    return {orderReference,po,sideMark}
  }
  const validateOrderMeta=()=>{
    clearMetaError()
    const meta=getOrderMeta()
    if (!meta.po || !meta.sideMark) {
      if(metaError)metaError.textContent="Please fill PO and Side Mark."
      if(poInput&&!meta.po){
        poInput.classList.add("input-error")
        shakeElement(poInput)
      }
      if(sideMarkInput&&!meta.sideMark){
        sideMarkInput.classList.add("input-error")
        shakeElement(sideMarkInput)
      }
      shakeElement(metaError)
      return {ok:false,meta}
    }
    if (meta.po.length > 50 || meta.sideMark.length > 50) {
      if (metaError) metaError.textContent = "PO and Side Mark must be within 50 characters."
      if (poInput && meta.po.length > 50) {
        poInput.classList.add("input-error")
        shakeElement(poInput)
      }
      if (sideMarkInput && meta.sideMark.length > 50) {
        sideMarkInput.classList.add("input-error")
        shakeElement(sideMarkInput)
      }
      shakeElement(metaError)
      return { ok: false, meta }
    }
    return {ok:true,meta}
  }
  const updateActionAvailability=()=>{
    const enabled=hasItems
    if(saveBtn)saveBtn.disabled=!enabled
    if(sendBtn)sendBtn.disabled=!enabled
  }

  const updateBadge=async()=>{
    const res=await window.apiFetch("/cart")
    if(!res||!res.ok)return
    const data=await res.json()
    const badge=window.qs(".cart-icon .badge")
    if(badge)badge.textContent=String((data.lines||[]).length)
  }

  const setActionButtonState=(btn,stateLabel,labels={})=>{
    if(!btn)return
    if(!btn.dataset.defaultText) btn.dataset.defaultText=btn.textContent.trim()
    if(stateLabel==="loading"){
      btn.textContent=labels.loading||"Loading..."
      btn.classList.add("is-loading")
      btn.classList.remove("is-success")
      btn.disabled=true
      return
    }
    if(stateLabel==="success"){
      btn.textContent=labels.success||"Done ✓"
      btn.classList.remove("is-loading")
      btn.classList.add("is-success")
      btn.disabled=true
      setTimeout(()=>{
        btn.textContent=btn.dataset.defaultText||""
        btn.classList.remove("is-success")
        btn.disabled=false
      },1400)
      return
    }
    btn.textContent=btn.dataset.defaultText||""
    btn.classList.remove("is-loading","is-success")
    btn.disabled=false
  }

  const formatNow=()=>{
    const d=new Date()
    const pad=n=>String(n).padStart(2,"0")
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const getModal=()=>{
    let root=document.querySelector(".cart-modal")
    if(root)return root
    root=document.createElement("div")
    root.className="cart-modal"
    root.innerHTML=`
      <div class="cart-modal-backdrop"></div>
      <div class="cart-modal-card">
        <div class="cart-modal-header">
          <strong data-modal-title></strong>
          <button class="ghost" data-modal-close>Close</button>
        </div>
        <div class="cart-modal-body" data-modal-body></div>
        <div class="cart-modal-actions">
          <button class="ghost" data-modal-cancel>Cancel</button>
          <button class="primary" data-modal-submit>Save</button>
        </div>
      </div>
    `
    document.body.appendChild(root)
    root.querySelector("[data-modal-close]").addEventListener("click",()=>closeModal(null))
    root.querySelector("[data-modal-cancel]").addEventListener("click",()=>closeModal(null))
    root.querySelector(".cart-modal-backdrop").addEventListener("click",()=>closeModal(null))
    return root
  }

  let modalResolver=null
  const closeModal=value=>{
    const root=document.querySelector(".cart-modal")
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
    form.className="cart-modal-form"
    const formError=document.createElement("div")
    formError.className="cart-modal-error"
    form.appendChild(formError)
    fields.forEach(field=>{
      const wrap=document.createElement("div")
      wrap.className="form-field"
      if(field.fullWidth)wrap.classList.add("field-full")
      const label=document.createElement("label")
      label.textContent=field.label||field.name
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
      }else{
        input=document.createElement("input")
        input.type=field.type||"text"
      }
      input.name=field.name
      input.placeholder=field.placeholder||""
      if(values&&values[field.name]!==undefined)input.value=values[field.name]
      if(field.step!==undefined)input.step=field.step
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
      })
      if(!ok)formError.textContent="Please fix the highlighted fields."
      return ok
    }
    return new Promise(resolve=>{
      modalResolver=resolve
      submitBtn.onclick=e=>{
        e.preventDefault()
        if(!validate())return
        const result={}
        fields.forEach(field=>{
          const input=form.querySelector(`[name="${field.name}"]`)
          if(!input)return
          result[field.name]=input.value
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
    body.innerHTML=`<div class="cart-modal-text">${content||""}</div>`
    root.classList.add("is-open")
    return new Promise(resolve=>{
      modalResolver=resolve
      root.querySelector("[data-modal-submit]").onclick=e=>{
        e.preventDefault()
        closeModal(true)
      }
    })
  }

  const pushField=(list,label,value,isLength=false)=>{
    const v=String(value||"").trim()
    if(!v)return
    list.push({label,value:isLength?`${formatLength(v)}${lengthLabel()}`:v})
  }
  const renderGroup=(title,fields)=>{
    const col=document.createElement("div")
    col.className="detail-col"
    col.innerHTML=`<div class="group-title">${title}</div>`
    fields.forEach(item=>{
      const block=document.createElement("div")
      block.innerHTML=`<strong>${item.label}</strong><div>${item.value}</div>`
      col.appendChild(block)
    })
    return col
  }
  const renderLine=(line,index)=>{
    const productText=line.productLabel||(window.materialCatalog&&typeof window.materialCatalog.getLabelSync==="function"?window.materialCatalog.getLabelSync(line.product):line.product)||""
    const base=[]
    const sizeText=line.width&&line.height?`${formatLength(line.width)}${lengthLabel()} * ${formatLength(line.height)}${lengthLabel()}`:""
    pushField(base,"SIZE (W X H)",sizeText)
    pushField(base,"PANEL CONFIG",line.panelConfig)
    pushField(base,"STYLE",line.style)
    pushField(base,"MOUNT",line.mount)
    const structureFields=[]
    pushField(structureFields,"CRITICAL MID RAIL",line.criticalMidRail)
    pushField(structureFields,"HORIZONTAL TPOST",line.horizontalTpost)
    pushField(structureFields,"TILT OPTION",line.tiltOption)
    pushField(structureFields,"MID RAIL",line.midRail1,true)
    pushField(structureFields,"MID RAIL 2",line.midRail2,true)
    pushField(structureFields,"SPLIT",line.split1,true)
    pushField(structureFields,"SPLIT 2",line.split2,true)
    pushField(structureFields,"TIER ON TIER",line.tierOnTier1,true)
    pushField(structureFields,"TIER ON TIER 2",line.tierOnTier2,true)
    pushField(structureFields,"FIRST PANEL OPENING",line.firstPanelOpening)
    pushField(structureFields,"POST POSITION 1",line.postPosition1,true)
    pushField(structureFields,"POST POSITION 2",line.postPosition2,true)
    pushField(structureFields,"POST POSITION 3",line.postPosition3,true)
    pushField(structureFields,"POST POSITION 4",line.postPosition4,true)
    pushField(structureFields,"POST POSITION 5",line.postPosition5,true)
    pushField(structureFields,"POST POSITION 6",line.postPosition6,true)
    pushField(structureFields,"ANGLE 1",line.angle1)
    pushField(structureFields,"ANGLE 2",line.angle2)
    pushField(structureFields,"ANGLE 3",line.angle3)
    pushField(structureFields,"ANGLE 4",line.angle4)
    pushField(structureFields,"ANGLE 5",line.angle5)
    pushField(structureFields,"ANGLE 6",line.angle6)
    const louverFields=[]
    pushField(louverFields,"LOUVER SIZE",line.louvresSize)
    pushField(louverFields,"LOUVER OPENING",line.louvresOpening)
    const stileFields=[]
    pushField(stileFields,"STILE TYPE",line.stile)
    pushField(stileFields,"TPOST TYPE",line.tpost || line.tPost)
    const frameFields=[]
    pushField(frameFields,"FRAME TYPE",line.frameType)
    pushField(frameFields,"FRAME SIDE LEFT",line.frameSideLeft)
    pushField(frameFields,"FRAME SIDE RIGHT",line.frameSideRight)
    pushField(frameFields,"FRAME SIDE TOP",line.frameSideTop)
    pushField(frameFields,"FRAME SIDE BOTTOM",line.frameSideBottom)
    pushField(frameFields,"SILL PLATE LEFT",line.cilplatesLeft)
    pushField(frameFields,"SILL PLATE RIGHT",line.cilplatesRight)
    pushField(frameFields,"SILL PLATE TOP",line.cilplatesTop)
    pushField(frameFields,"SILL PLATE BOTTOM",line.cilplatesBottom)
    pushField(frameFields,"FRAME BUILD OUT LEFT",line.buildUpLeft,true)
    pushField(frameFields,"FRAME BUILD OUT RIGHT",line.buildUpRight,true)
    pushField(frameFields,"FRAME BUILD OUT TOP",line.buildUpTop,true)
    pushField(frameFields,"FRAME BUILD OUT BOTTOM",line.buildUpBottom,true)
    pushField(frameFields,"BATTENS WIDTH",line.battensWidth,true)
    pushField(frameFields,"BATTENS DEPTH",line.battensDepth,true)
    pushField(frameFields,"BATTENS HEIGHT",line.battensHeight,true)
    const finishFields=[]
    pushField(finishFields,"SHUTTER COLOR",line.shutterColor)
    pushField(finishFields,"HINGE COLOR",line.hingeColor)
    pushField(finishFields,"NOTES",line.notes)
    const trackFields=[]
    if (line.style === "Bi-Fold Track" || line.style === "Bypass Track") {
      pushField(trackFields,"TRACK OPTION",line.trackOption)
      if (line.style === "Bi-Fold Track") pushField(trackFields,"SLIDING OPTION",line.slidingOption)
    }
    const shapeFields=[]
    if (line.style === "Shape") {
      pushField(shapeFields,"SHAPE TYPE",line.shapeType)
      pushField(shapeFields,"DRAWING UPLOAD",line.drawingUpload)
    }
    const item=document.createElement("div")
    item.className="detail-item"
    item.innerHTML=`
      <div class="detail-header">
        <span class="pill">#${index+1}</span>
        <strong>${line.room||""}</strong>
        <span class="pill">${productText}</span>
        <div class="detail-amount">${formatArea(line.sqm)}${areaLabel()}</div>
        <div class="detail-actions">
          <button class="ghost" data-action="edit" data-id="${line.id}">Edit</button>
          <button class="light" data-action="remove" data-id="${line.id}">Remove</button>
        </div>
      </div>
    `
    const grid=document.createElement("div")
    grid.className="detail-grid"
    if(base.length)grid.appendChild(renderGroup("A. GENERAL",base))
    if(structureFields.length)grid.appendChild(renderGroup("B. STRUCTURE",structureFields))
    if(louverFields.length)grid.appendChild(renderGroup("C. LOUVER",louverFields))
    if(stileFields.length)grid.appendChild(renderGroup("D. STILE&TPOST",stileFields))
    if(frameFields.length)grid.appendChild(renderGroup("E. FRAME",frameFields))
    if(finishFields.length)grid.appendChild(renderGroup("F. FINISH",finishFields))
    if(trackFields.length)grid.appendChild(renderGroup("G. TRACK",trackFields))
    if(shapeFields.length)grid.appendChild(renderGroup("H. SHAPE",shapeFields))
    item.appendChild(grid)
    return item
  }

  const render=lines=>{
    cache={}
    if(list)list.innerHTML=""
    const count=lines.length
    hasItems=count>0
    lines.forEach((line,index)=>{
      cache[line.id]=line
      if(list)list.appendChild(renderLine(line,index))
    })
    const totalSqm=lines.reduce((sum,l)=>sum+(parseFloat(l.sqm||"0")||0),0).toFixed(2)
    if(sqmEl)sqmEl.textContent=`${formatArea(totalSqm)}${areaLabel()}`
    if(dateEl)dateEl.textContent=formatNow()
    if(empty)empty.style.display=count===0?"":"none"
    if(!hasItems){
      if(saveBtn) setActionButtonState(saveBtn,"default")
      if(sendBtn) setActionButtonState(sendBtn,"default")
    }
    updateActionAvailability()
  }

  const load=async()=>{
    const res=await window.apiFetch("/cart")
    if(!res||!res.ok)return
    const data=await res.json()
    render(data.lines||[])
    if(orderNoEl)orderNoEl.textContent=data.orderNo||orderNoEl.textContent||"DRAFT"
    if(companyEl){
      const companyRes=await window.apiFetch("/company/current")
      if(companyRes&&companyRes.ok){
        const company=await companyRes.json()
        companyEl.textContent=company.name||company.id||"-"
      }else companyEl.textContent="-"
    }
  }

  if(list){
    list.addEventListener("click",async e=>{
      const btn=e.target.closest("[data-action]")
      if(!btn)return
      const id=btn.dataset.id
      const current=cache[id]
      if(!current)return
      if(btn.dataset.action==="remove"){
        const ok=await openConfirmModal({title:"Remove Item",content:"Remove this shutter from cart?",confirmLabel:"Remove"})
        if(!ok)return
        const res=await window.apiFetch(`/cart/lines/${id}`,{method:"DELETE"})
        if(res&&res.ok){await updateBadge();load()}
        return
      }
      if(btn.dataset.action==="edit"){
        localStorage.setItem("cart_edit_line",JSON.stringify(current))
        if(window.parent&&window.parent!==window){
          const drawer=window.parent.document.querySelector(".cart-drawer")
          if(drawer)drawer.classList.remove("is-open")
          window.parent.location.href="/configurator.html"
        }else{
          location.href="/configurator.html"
        }
      }
    })
  }

  if(saveBtn){
    saveBtn.addEventListener("click",async()=>{
      const checked=validateOrderMeta()
      if(!checked.ok)return
      let success=false
      setActionButtonState(saveBtn,"loading",{loading:"Saving..."})
      try{
        const res=await window.apiFetch("/cart/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(checked.meta)})
        if(res&&res.ok){
          if(refInput)refInput.value=""
          if(poInput)poInput.value=""
          if(sideMarkInput)sideMarkInput.value=""
          clearMetaError()
          await updateBadge()
          load()
          success=true
          setActionButtonState(saveBtn,"success",{success:"Saved ✓"})
        }
      }catch(e){
      }finally{
        if(!success) setActionButtonState(saveBtn,"default")
      }
    })
  }
  if(sendBtn){
    sendBtn.addEventListener("click",async()=>{
      const checked=validateOrderMeta()
      if(!checked.ok)return
      const ok=await openConfirmModal({title:"Send Order",content:"Submit this order now?",confirmLabel:"Send"})
      if(!ok)return
      let success=false
      setActionButtonState(sendBtn,"loading",{loading:"Sending..."})
      try{
        const res=await window.apiFetch("/cart/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(checked.meta)})
        if(res&&res.ok){
          if(refInput)refInput.value=""
          if(poInput)poInput.value=""
          if(sideMarkInput)sideMarkInput.value=""
          clearMetaError()
          await updateBadge()
          load()
          success=true
          setActionButtonState(sendBtn,"success",{success:"Sent ✓"})
        }
      }catch(e){
      }finally{
        if(!success) setActionButtonState(sendBtn,"default")
      }
    })
  }
  ;[poInput,sideMarkInput].forEach(input=>{
    if(!input)return
    input.addEventListener("input",()=>{ clearMetaError(); updateActionAvailability() })
  })

  updateAreaLabel()
  document.addEventListener("unit-change",()=>{
    updateAreaLabel()
    render(Object.values(cache))
  })
  window.addEventListener("storage",(e)=>{
    if(e&&e.key==="unit_preference"){
      updateAreaLabel()
      render(Object.values(cache))
    }
  })
  ;(async()=>{
    if(window.materialCatalog&&typeof window.materialCatalog.load==="function"){
      await window.materialCatalog.load()
    }
    await load()
    await updateBadge()
  })()
}
