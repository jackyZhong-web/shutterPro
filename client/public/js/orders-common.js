const formatOrderDate = (value) => {
  if (!value) return ""
  const raw = String(value)
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
  const date = new Date(hasZone ? raw : raw)
  if (!Number.isFinite(date.getTime())) return raw
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

window.renderOrders = (rows, tbody, detailBase, options = {}) => {
  const showStatus = !!options.showStatus
  const showMark = !!options.showMark
  const showActions = !!options.showActions
  const escapeAttr = (value) => String(value || "").replace(/"/g, "&quot;")
  tbody.innerHTML = ""
  const units = window.units || {}
  const getUnit = () => (units.getUnit ? units.getUnit() : "mm")
  const formatArea = (sqm) => (units.formatAreaFromSqm ? units.formatAreaFromSqm(sqm, getUnit()) : (sqm || "0.00"))
  const areaLabel = units.areaLabel ? units.areaLabel(getUnit()) : "㎡"
  rows.forEach(order => {
    const tr = document.createElement("tr")
    tr.dataset.orderId = order.id || ""
    const statusCell = showStatus ? `<td>${order.status || ""}</td>` : ""
    const markCell = showMark ? `<td>${order.mark || ""}</td>` : ""
    const areaText = formatArea(order.sqmTotal)
    const poText = String(order.po || "")
    const sideMarkText = String(order.sideMark || "")
    const actionCell = showActions ? `
      <td class="action-cell">
        <button class="ghost small action-trigger" type="button" data-action-trigger>⋯</button>
        <div class="action-menu">
          <a class="action-item" href="${detailBase}?id=${order.id}" data-order-link>Detail</a>
          <button class="action-item" type="button" data-remake-open data-order-id="${order.id || ""}">Remake</button>
        </div>
      </td>
    ` : `<td><a class="link" href="${detailBase}?id=${order.id}" data-order-link>›</a></td>`
    tr.innerHTML = `
      <td><a class="link" href="${detailBase}?id=${order.id}" data-order-link>${order.orderNo || ""}</a></td>
      <td>${order.customerName || ""}</td>
      <td>${order.companyName || ""}</td>
      <td>${order.orderReference || ""}</td>
      <td><span class="cell-ellipsis" title="${escapeAttr(poText)}">${poText}</span></td>
      <td><span class="cell-ellipsis" title="${escapeAttr(sideMarkText)}">${sideMarkText}</span></td>
      <td>${formatOrderDate(order.date)}</td>
      <td>${areaText}${areaLabel}</td>
      ${statusCell}
      ${markCell}
      ${actionCell}
    `
    tbody.appendChild(tr)
  })
}

window.renderOrderDetail = (order, isEditable) => {
  const units = window.units || {}
  const getUnit = () => (units.getUnit ? units.getUnit() : "mm")
  const lengthLabel = units.unitLabel ? units.unitLabel(getUnit()) : "mm"
  const formatLength = (mm) => (units.formatLength ? units.formatLength(mm, getUnit()) : (mm || ""))
  const formatArea = (sqm) => (units.formatAreaFromSqm ? units.formatAreaFromSqm(sqm, getUnit()) : (sqm || "0.00"))
  const areaLabel = units.areaLabel ? units.areaLabel(getUnit()) : "㎡"
  const pushField = (list, label, value, isLength = false) => {
    const v = String(value || "").trim()
    if (!v) return
    list.push({ label, value: v })
  }
  const downloadFile = async (fileId, fileName) => {
    if (!fileId) return
    const res = await window.apiFetch(`/files/${fileId}`)
    if (!res || !res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName || "drawing-upload"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const renderGroup = (title, fields) => {
    const col = document.createElement("div")
    col.className = "detail-col"
    col.innerHTML = `<div class="group-title">${title}</div>`
    fields.forEach(item => {
      const block = document.createElement("div")
      const label = document.createElement("strong")
      label.textContent = item.label || ""
      const value = document.createElement("div")
      if (item.fileId) {
        const link = document.createElement("a")
        link.href = "#"
        link.className = "link"
        link.dataset.orderDrawingDownload = "1"
        link.dataset.fileId = item.fileId
        link.dataset.fileName = item.value || ""
        link.textContent = item.value || "Download"
        value.appendChild(link)
      } else {
        value.textContent = item.value || ""
      }
      block.appendChild(label)
      block.appendChild(value)
      col.appendChild(block)
    })
    return col
  }
  const orderNo = window.qs("[data-order-no]")
  const orderDate = window.qs("[data-order-date]")
  if (orderNo) orderNo.textContent = order.orderNo || ""
  if (orderDate) orderDate.textContent = formatOrderDate(order.date)
  const info = window.qs("[data-order-info]")
  if (info) {
    const statusRow = isEditable ? `<div>Status<strong>${order.status || ""}</strong></div>` : ""
    info.innerHTML = `
      <div>Customer<strong>${order.customerName || ""}</strong></div>
      <div>Order ID<strong>${order.orderNo || ""}</strong></div>
      <div>PO<strong class="order-meta-multiline">${order.po || ""}</strong></div>
      <div>Side Mark<strong class="order-meta-multiline">${order.sideMark || ""}</strong></div>
      <div>Order Date<strong>${formatOrderDate(order.date)}</strong></div>
      <div>${getUnit() === "inch" ? "Total ft²" : "Total SQM"}<strong>${formatArea(order.sqmTotal)}${areaLabel}</strong></div>
      ${statusRow}
    `
  }
  const list = window.qs("[data-order-lines]")
  if (list) {
    list.innerHTML = ""
    const header = list.closest(".order-card") ? list.closest(".order-card").querySelector(".detail-header") : null
    if (header && isEditable && order.status === "pending") {
      let addBtn = header.querySelector("[data-order-add-line]")
      if (!addBtn) {
        addBtn = document.createElement("button")
        addBtn.className = "primary"
        addBtn.type = "button"
        addBtn.textContent = "Add Shutter"
        addBtn.setAttribute("data-order-add-line","1")
        header.appendChild(addBtn)
      }
      addBtn.onclick = () => {
        localStorage.setItem("order_edit_line", JSON.stringify({ orderId: order.id, mode: "add" }))
        const editModal = window.qs("[data-order-edit-modal]")
        const editFrame = window.qs("[data-order-edit-frame]")
        if (editFrame) editFrame.src = "/order-line-edit.html"
        if (editModal) editModal.classList.add("is-open")
      }
    }
    order.lines.forEach((line, index) => {
      const base = []
      const sizeText = line.width && line.height ? `${formatLength(line.width)}${lengthLabel} * ${formatLength(line.height)}${lengthLabel}` : ""
      pushField(base, "SIZE (W X H)", sizeText)
      pushField(base, "PANEL CONFIG", line.panelConfig)
      pushField(base, "STYLE", line.style)
      pushField(base, "MOUNT", line.mount)
      const structureFields = []
      pushField(structureFields, "CRITICAL MID RAIL", line.criticalMidRail)
      pushField(structureFields, "HORIZONTAL TPOST", line.horizontalTpost)
      pushField(structureFields, "TILT OPTION", line.tiltOption)
      pushField(structureFields, "MID RAIL", line.midRail1, true)
      pushField(structureFields, "MID RAIL 2", line.midRail2, true)
      pushField(structureFields, "SPLIT", line.split1, true)
      pushField(structureFields, "SPLIT 2", line.split2, true)
      pushField(structureFields, "TIER ON TIER", line.tierOnTier1, true)
      pushField(structureFields, "TIER ON TIER 2", line.tierOnTier2, true)
      pushField(structureFields, "FIRST PANEL OPENING", line.firstPanelOpening)
      pushField(structureFields, "POST POSITION 1", line.postPosition1, true)
      pushField(structureFields, "POST POSITION 2", line.postPosition2, true)
      pushField(structureFields, "POST POSITION 3", line.postPosition3, true)
      pushField(structureFields, "POST POSITION 4", line.postPosition4, true)
      pushField(structureFields, "POST POSITION 5", line.postPosition5, true)
      pushField(structureFields, "POST POSITION 6", line.postPosition6, true)
      pushField(structureFields, "ANGLE 1", line.angle1)
      pushField(structureFields, "ANGLE 2", line.angle2)
      pushField(structureFields, "ANGLE 3", line.angle3)
      pushField(structureFields, "ANGLE 4", line.angle4)
      pushField(structureFields, "ANGLE 5", line.angle5)
      pushField(structureFields, "ANGLE 6", line.angle6)
      const louverFields = []
      pushField(louverFields, "LOUVER SIZE", line.louvresSize)
      pushField(louverFields, "LOUVER OPENING", line.louvresOpening)
      const stileFields = []
      pushField(stileFields, "STILE TYPE", line.stile)
      pushField(stileFields, "TPOST TYPE", line.tpost || line.tPost)
      const frameFields = []
      pushField(frameFields, "FRAME TYPE", line.frameType)
      pushField(frameFields, "FRAME SIDE LEFT", line.frameSideLeft)
      pushField(frameFields, "FRAME SIDE RIGHT", line.frameSideRight)
      pushField(frameFields, "FRAME SIDE TOP", line.frameSideTop)
      pushField(frameFields, "FRAME SIDE BOTTOM", line.frameSideBottom)
      pushField(frameFields, "SILL PLATE LEFT", line.cilplatesLeft)
      pushField(frameFields, "SILL PLATE RIGHT", line.cilplatesRight)
      pushField(frameFields, "SILL PLATE TOP", line.cilplatesTop)
      pushField(frameFields, "SILL PLATE BOTTOM", line.cilplatesBottom)
      pushField(frameFields, "FRAME BUILD OUT LEFT", line.buildUpLeft, true)
      pushField(frameFields, "FRAME BUILD OUT RIGHT", line.buildUpRight, true)
      pushField(frameFields, "FRAME BUILD OUT TOP", line.buildUpTop, true)
      pushField(frameFields, "FRAME BUILD OUT BOTTOM", line.buildUpBottom, true)
      pushField(frameFields, "BATTENS WIDTH", line.battensWidth, true)
      pushField(frameFields, "BATTENS DEPTH", line.battensDepth, true)
      pushField(frameFields, "BATTENS HEIGHT", line.battensHeight, true)
      const finishFields = []
      pushField(finishFields, "SHUTTER COLOR", line.shutterColor)
      pushField(finishFields, "HINGE COLOR", line.hingeColor)
      pushField(finishFields, "NOTES", line.notes)
      const trackFields = []
      if (line.style === "Bi-Fold Track" || line.style === "Bypass Track") {
        pushField(trackFields, "TRACK OPTION", line.trackOption)
        if (line.style === "Bi-Fold Track") pushField(trackFields, "SLIDING OPTION", line.slidingOption)
      }
      const shapeFields = []
      if (line.style === "Shape") {
        pushField(shapeFields, "SHAPE TYPE", line.shapeType)
        const uploadName = String(line.drawingUpload || "").trim()
        const uploadId = String(line.drawingUploadFileId || "").trim()
        if (uploadName || uploadId) shapeFields.push({ label: "DRAWING UPLOAD", value: uploadName || "Download file", fileId: uploadId })
      }
      const canEditLine = isEditable && order.status === "pending"
      const editButton = canEditLine ? `<div style="margin-left:10px"><button class="primary" data-order-edit-line="${index}" data-line-id="${line.id || ""}">Edit</button></div>` : ""
      const productText = line.productLabel || (window.materialCatalog && typeof window.materialCatalog.getLabelSync === "function" ? window.materialCatalog.getLabelSync(line.product) : (line.product || ""))
      const item = document.createElement("div")
      item.className = "detail-item"
      item.innerHTML = `
        <div class="detail-header">
          <span class="pill">#${index + 1}</span>
          <strong>${line.room || ""}</strong>
          <span class="pill">${productText}</span>
          <div style="margin-left:auto">${formatArea(line.sqm)}${areaLabel}</div>
          ${editButton}
        </div>
      `
      const grid = document.createElement("div")
      grid.className = "detail-grid"
      if (base.length) grid.appendChild(renderGroup("A. GENERAL", base.map(item => item)))
      if (structureFields.length) grid.appendChild(renderGroup("B. STRUCTURE", structureFields.map(item => {
        if (!item.value || !item.value.trim()) return item
        const isLength = ["MID RAIL", "MID RAIL 2", "SPLIT", "SPLIT 2", "TIER ON TIER", "TIER ON TIER 2", "POST POSITION 1", "POST POSITION 2", "POST POSITION 3", "POST POSITION 4", "POST POSITION 5", "POST POSITION 6"].includes(item.label)
        if (!isLength) return item
        return { label: item.label, value: `${formatLength(item.value)}${lengthLabel}` }
      }).filter(Boolean)))
      if (louverFields.length) grid.appendChild(renderGroup("C. LOUVER", louverFields))
      if (stileFields.length) grid.appendChild(renderGroup("D. STILE&TPOST", stileFields))
      if (frameFields.length) grid.appendChild(renderGroup("E. FRAME", frameFields.map(item => {
        if (!item.value || !item.value.trim()) return item
        const isLength = ["BUILD UP LEFT", "BUILD UP RIGHT", "BUILD UP TOP", "BUILD UP BOTTOM", "BATTENS WIDTH", "BATTENS DEPTH", "BATTENS HEIGHT"].includes(item.label)
        if (!isLength) return item
        return { label: item.label, value: `${formatLength(item.value)}${lengthLabel}` }
      }).filter(Boolean)))
      if (finishFields.length) grid.appendChild(renderGroup("F. FINISH", finishFields))
      if (trackFields.length) grid.appendChild(renderGroup("G. TRACK", trackFields))
      if (shapeFields.length) grid.appendChild(renderGroup("H. SHAPE", shapeFields))
      item.appendChild(grid)
      list.appendChild(item)
    })
    if (!list.dataset.orderDrawingDownloadBound) {
      list.dataset.orderDrawingDownloadBound = "1"
      list.addEventListener("click", (e) => {
        const link = e.target.closest("[data-order-drawing-download]")
        if (!link) return
        e.preventDefault()
        downloadFile(link.dataset.fileId || "", link.dataset.fileName || "")
      })
    }
  }
  const sendBtn = window.qs("[data-order-send]")
  if (sendBtn && isEditable) {
    if (order.status === "sent") {
      sendBtn.remove()
    } else {
      sendBtn.disabled = order.status !== "pending"
      sendBtn.onclick = async () => {
        const res = await window.apiFetch(`/orders/${order.id}/send`, { method: "POST" })
        if (res && res.ok) location.href = "/order-history.html"
      }
    }
  }
  const editModal = window.qs("[data-order-edit-modal]")
  const editFrame = window.qs("[data-order-edit-frame]")
  const editClose = window.qs("[data-order-edit-close]")
  if (editModal && editFrame && editClose) {
    editClose.onclick = () => {
      editModal.classList.remove("is-open")
      editFrame.src = "about:blank"
    }
    if (!window.__orderEditListenerAdded) {
      window.addEventListener("message", (event) => {
        if (!event || !event.data || event.data.type !== "order-line-updated") return
        editModal.classList.remove("is-open")
        editFrame.src = "about:blank"
        window.apiFetch(`/orders/${order.id}`).then(res => res ? res.json() : null).then(nextOrder => {
          if (nextOrder) window.renderOrderDetail(nextOrder, true)
        })
      })
      window.__orderEditListenerAdded = true
    }
    if (list && !list.dataset.orderEditBound) {
      list.dataset.orderEditBound = "1"
      list.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-order-edit-line]")
        if (!btn) return
        const lineId = btn.dataset.lineId || ""
        const lineIndex = parseInt(btn.dataset.orderEditLine, 10)
        localStorage.setItem("order_edit_line", JSON.stringify({ orderId: order.id, lineId, lineIndex, mode: "edit" }))
        editFrame.src = "/order-line-edit.html"
        editModal.classList.add("is-open")
      })
    }
  }
}
