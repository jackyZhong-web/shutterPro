window.remakesInit=()=>{
  const page=document.body.getAttribute("data-page")||""
  const toDateKey=(value)=>{
    if(!value)return ""
    const raw=String(value)
    const hasZone=/Z$|[+-]\d{2}:?\d{2}$/.test(raw)
    const date=new Date(hasZone?raw:raw)
    if(!Number.isFinite(date.getTime()))return raw.length>=10?raw.slice(0,10):raw
    const pad=n=>String(n).padStart(2,"0")
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
  }
  const statusClass=(status)=>{
    if(status==="approved")return "status-approved"
    if(status==="refused")return "status-refused"
    return "status-sent"
  }
  const statusLabel=(status)=>{
    if(status==="approved")return "Approved"
    if(status==="refused")return "Refused"
    return "Sent"
  }
  const renderTypes=(types)=>Array.isArray(types)?types.join(" / "):""
  if(page==="remakes"){
    const tbody=document.querySelector("[data-remake-list]")
    const searchInput=document.querySelector("[data-remake-search]")
    const dateInput=document.querySelector("[data-remake-date]")
    const applyBtn=document.querySelector(".filters .apply")
    const modal=document.querySelector("[data-remake-user-modal]")
    const closeBtns=document.querySelectorAll("[data-remake-user-close]")
    const remakeNoEl=document.querySelector("[data-user-remake-no]")
    const orderNoEl=document.querySelector("[data-user-remake-order-no]")
    const customerEl=document.querySelector("[data-user-remake-customer]")
    const companyEl=document.querySelector("[data-user-remake-company]")
    const statusEl=document.querySelector("[data-user-remake-status]")
    const lineEl=document.querySelector("[data-user-remake-line]")
    const typesEl=document.querySelector("[data-user-remake-types]")
    const fileEl=document.querySelector("[data-user-remake-file]")
    const noteEl=document.querySelector("[data-user-remake-note]")
    const commentEl=document.querySelector("[data-user-remake-comment]")
    let allRows=[]
    const toText=value=>String(value||"").toLowerCase()
    const matchQuery=(row,query)=>{
      if(!query)return true
      const tokens=query.split("*").map(t=>t.trim()).filter(Boolean)
      const hay=toText([row.remakeNo,row.orderNo,row.customerName,row.companyName].join(" "))
      if(tokens.length>1)return tokens.every(t=>hay.includes(toText(t)))
      return hay.includes(toText(query))
    }
    const downloadFile=async(fileId,fileName)=>{
      if(!fileId)return
      const res=await window.apiFetch(`/files/${fileId}`)
      if(!res||!res.ok)return
      const blob=await res.blob()
      const url=URL.createObjectURL(blob)
      const a=document.createElement("a")
      a.href=url
      a.download=fileName||"file"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
    const openDetail=(row)=>{
      if(remakeNoEl)remakeNoEl.textContent=row.remakeNo||"-"
      if(orderNoEl)orderNoEl.textContent=row.orderNo||"-"
      if(customerEl)customerEl.textContent=row.customerName||"-"
      if(companyEl)companyEl.textContent=row.companyName||"-"
      if(statusEl)statusEl.innerHTML=`<span class="status-pill ${statusClass(row.status)}">${statusLabel(row.status)}</span>`
      if(lineEl)lineEl.textContent=row.lineLabel||"-"
      if(typesEl){
        typesEl.innerHTML=""
        const list=Array.isArray(row.types)?row.types:(row.typesText?row.typesText.split(" / "):[])
        list.filter(Boolean).forEach(item=>{
          const span=document.createElement("span")
          span.className="remake-chip"
          span.textContent=item
          typesEl.appendChild(span)
        })
      }
      if(fileEl){
        if(row.fileId){
          const btn=document.createElement("button")
          btn.className="link-button"
          btn.type="button"
          btn.dataset.fileId=row.fileId
          btn.dataset.fileName=row.fileName||"file"
          btn.textContent=row.fileName||"Download file"
          fileEl.innerHTML=""
          fileEl.appendChild(btn)
        }else{
          fileEl.textContent="-"
        }
      }
      if(noteEl)noteEl.textContent=row.note||"-"
      if(commentEl)commentEl.textContent=row.comment||"-"
      if(modal)modal.classList.add("is-open")
    }
    const render=()=>{
      if(!tbody)return
      const query=searchInput?searchInput.value.trim():""
      const dateVal=dateInput?dateInput.value:""
      let rows=allRows.filter(row=>matchQuery(row,query))
      if(dateVal)rows=rows.filter(row=>toDateKey(row.date)===dateVal)
      tbody.innerHTML=""
      rows.forEach(row=>{
        const tr=document.createElement("tr")
        const typesText=row.typesText||renderTypes(row.types)
        const note=row.note||""
        const comment=row.comment||""
        tr.innerHTML=`
          <td>${row.remakeNo||""}</td>
          <td>${row.orderNo||""}</td>
          <td>${row.customerName||""}</td>
          <td>${typesText}</td>
          <td><span class="status-pill ${statusClass(row.status)}">${statusLabel(row.status)}</span></td>
          <td>${toDateKey(row.date)}</td>
          <td><span class="text-ellipsis" title="${note}">${note}</span></td>
          <td><span class="text-ellipsis" title="${comment}">${comment}</span></td>
          <td><button class="ghost small" type="button" data-user-remake-view data-remake-id="${row.id||""}">Review</button></td>
        `
        tbody.appendChild(tr)
      })
    }
    const apply=()=>render()
    if(closeBtns.length){
      closeBtns.forEach(btn=>btn.addEventListener("click",()=>{if(modal)modal.classList.remove("is-open")}))
    }
    if(modal){
      modal.addEventListener("click",(e)=>{
        const btn=e.target.closest("[data-file-id]")
        if(!btn)return
        downloadFile(btn.dataset.fileId,btn.dataset.fileName)
      })
    }
    if(tbody){
      tbody.addEventListener("click",(e)=>{
        const btn=e.target.closest("[data-user-remake-view]")
        if(!btn)return
        const id=btn.dataset.remakeId||""
        const row=allRows.find(item=>item.id===id)
        if(row)openDetail(row)
      })
    }
    if(applyBtn)applyBtn.addEventListener("click",apply)
    if(searchInput)searchInput.addEventListener("keydown",e=>{if(e.key==="Enter")apply()})
    if(dateInput)dateInput.addEventListener("change",apply)
    window.apiFetch("/remakes").then(res=>res?res.json():null).then(rows=>{
      allRows=rows||[]
      render()
    })
  }
  if(page==="admin-remakes"){
    const tbody=document.querySelector("[data-remake-list]")
    const searchInput=document.querySelector("[data-remake-search]")
    const dateInput=document.querySelector("[data-remake-date]")
    const applyBtn=document.querySelector(".filters .apply")
    const modal=document.querySelector("[data-remake-admin-modal]")
    const closeBtns=document.querySelectorAll("[data-remake-admin-close]")
    const approveBtn=document.querySelector("[data-admin-remake-approve]")
    const refuseBtn=document.querySelector("[data-admin-remake-refuse]")
    const commentInput=document.querySelector("[data-refuse-comment]")
    const actionsEl=document.querySelector("[data-admin-remake-actions]")
    const titleEl=document.querySelector("[data-admin-remake-no]")
    const statusEl=document.querySelector("[data-admin-remake-status]")
    const lineEl=document.querySelector("[data-admin-remake-line]")
    const typesEl=document.querySelector("[data-admin-remake-types]")
    const fileEl=document.querySelector("[data-admin-remake-file]")
    const noteEl=document.querySelector("[data-admin-remake-note]")
    let allRows=[]
    let current=null
    const toText=value=>String(value||"").toLowerCase()
    const matchQuery=(row,query)=>{
      if(!query)return true
      const tokens=query.split("*").map(t=>t.trim()).filter(Boolean)
      const hay=toText([row.remakeNo,row.orderNo,row.customerName,row.companyName].join(" "))
      if(tokens.length>1)return tokens.every(t=>hay.includes(toText(t)))
      return hay.includes(toText(query))
    }
    const render=()=>{
      if(!tbody)return
      const query=searchInput?searchInput.value.trim():""
      const dateVal=dateInput?dateInput.value:""
      let rows=allRows.filter(row=>matchQuery(row,query))
      if(dateVal)rows=rows.filter(row=>toDateKey(row.date)===dateVal)
      tbody.innerHTML=""
      rows.forEach(row=>{
        const tr=document.createElement("tr")
        tr.dataset.remakeId=row.id||""
        const typesText=row.typesText||renderTypes(row.types)
        const note=row.note||""
        const comment=row.comment||""
        const actionCell=`<button class="ghost small" type="button" data-admin-remake-view>Review</button>`
        tr.innerHTML=`
          <td>${row.remakeNo||""}</td>
          <td>${row.orderNo||""}</td>
          <td>${row.customerName||""}</td>
          <td>${row.companyName||""}</td>
          <td>${typesText}</td>
          <td><span class="status-pill ${statusClass(row.status)}">${statusLabel(row.status)}</span></td>
          <td>${toDateKey(row.date)}</td>
          <td><span class="text-ellipsis" title="${note}">${note}</span></td>
          <td><span class="text-ellipsis" title="${comment}">${comment}</span></td>
          <td>${actionCell}</td>
        `
        tbody.appendChild(tr)
      })
    }
    const setButtons=(status)=>{
      const editable=status==="sent"
      if(actionsEl)actionsEl.style.display=editable?"flex":"none"
      if(approveBtn)approveBtn.disabled=!editable
      if(refuseBtn)refuseBtn.disabled=!editable
      if(commentInput)commentInput.disabled=!editable
      if(commentInput&&!editable)commentInput.value=current?current.comment||"": ""
    }
    const downloadFile=async(fileId,fileName)=>{
      const res=await window.apiFetch(`/files/${fileId}`)
      if(!res||!res.ok)return
      const blob=await res.blob()
      const url=URL.createObjectURL(blob)
      const a=document.createElement("a")
      a.href=url
      a.download=fileName||"file"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
    const openDetail=(row)=>{
      current=row
      if(titleEl)titleEl.textContent=row.remakeNo||""
      if(statusEl)statusEl.innerHTML=`<span class="status-pill ${statusClass(row.status)}">${statusLabel(row.status)}</span>`
      if(lineEl)lineEl.textContent=row.lineLabel||""
      if(typesEl){
        typesEl.innerHTML=""
        const list=Array.isArray(row.types)?row.types:(row.typesText?row.typesText.split(" / "):[])
        list.filter(Boolean).forEach(item=>{
          const span=document.createElement("span")
          span.className="remake-chip"
          span.textContent=item
          typesEl.appendChild(span)
        })
      }
      if(fileEl){
        if(row.fileId){
          const btn=document.createElement("button")
          btn.className="link-button"
          btn.type="button"
          btn.dataset.fileId=row.fileId
          btn.dataset.fileName=row.fileName||"file"
          btn.textContent=row.fileName||"Download file"
          fileEl.innerHTML=""
          fileEl.appendChild(btn)
        }else{
          fileEl.textContent="-"
        }
      }
      if(noteEl)noteEl.textContent=row.note||"-"
      if(commentInput)commentInput.value=row.comment||""
      setButtons(row.status)
      if(modal)modal.classList.add("is-open")
    }
    if(closeBtns.length){
      closeBtns.forEach(btn=>btn.addEventListener("click",()=>{if(modal)modal.classList.remove("is-open")}))
    }
    if(modal){
      modal.addEventListener("click",(e)=>{
        const btn=e.target.closest("[data-file-id]")
        if(!btn)return
        downloadFile(btn.dataset.fileId,btn.dataset.fileName)
      })
    }
    if(tbody){
      tbody.addEventListener("click",(e)=>{
        const btn=e.target.closest("[data-admin-remake-view]")
        if(!btn)return
        const row=btn.closest("tr")
        const id=row?row.dataset.remakeId:""
        if(!id)return
        window.apiFetch(`/admin/remakes/${id}`).then(res=>res?res.json():null).then(data=>{
          if(data)openDetail(data)
        })
      })
    }
    if(approveBtn){
      approveBtn.addEventListener("click",async()=>{
        if(!current||current.status!=="sent")return
        approveBtn.disabled=true
        approveBtn.textContent="Approving..."
        const res=await window.apiFetch(`/admin/remakes/${current.id}/approve`,{method:"PUT"})
        if(res&&res.ok){
          current.status="approved"
          setButtons(current.status)
          if(statusEl)statusEl.innerHTML=`<span class="status-pill ${statusClass(current.status)}">${statusLabel(current.status)}</span>`
          approveBtn.textContent="Approved ✓"
          if(modal)modal.classList.remove("is-open")
          load()
          return
        }
        approveBtn.disabled=false
        approveBtn.textContent="Approve"
      })
    }
    if(refuseBtn){
      refuseBtn.addEventListener("click",async()=>{
        if(!current||current.status!=="sent")return
        const comment=commentInput?commentInput.value.trim():""
        if(!comment){
          if(commentInput)commentInput.focus()
          return
        }
        refuseBtn.disabled=true
        refuseBtn.textContent="Refusing..."
        const res=await window.apiFetch(`/admin/remakes/${current.id}/refuse`,{
          method:"PUT",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({comment})
        })
        if(res&&res.ok){
          current.status="refused"
          current.comment=comment
          setButtons(current.status)
          if(statusEl)statusEl.innerHTML=`<span class="status-pill ${statusClass(current.status)}">${statusLabel(current.status)}</span>`
          refuseBtn.textContent="Refused ✓"
          if(modal)modal.classList.remove("is-open")
          load()
          return
        }
        refuseBtn.disabled=false
        refuseBtn.textContent="Refuse"
      })
    }
    const load=()=>{
      const query=searchInput?searchInput.value.trim():""
      const dateVal=dateInput?dateInput.value:""
      const params=[]
      if(query)params.push(`q=${encodeURIComponent(query)}`)
      if(dateVal)params.push(`date=${encodeURIComponent(dateVal)}`)
      const url=`/admin/remakes${params.length?`?${params.join("&")}`:""}`
      window.apiFetch(url).then(res=>res?res.json():null).then(rows=>{
        allRows=rows||[]
        render()
      })
    }
    if(applyBtn)applyBtn.addEventListener("click",load)
    if(searchInput)searchInput.addEventListener("keydown",e=>{if(e.key==="Enter")load()})
    if(dateInput)dateInput.addEventListener("change",load)
    load()
  }
}

document.addEventListener("DOMContentLoaded",()=>{if(window.remakesInit)window.remakesInit()})
