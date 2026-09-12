window.ordersInit = () => {
  const page = document.body.getAttribute("data-page") || ""
  const units = window.units || {}
  const getUnit = () => (units.getUnit ? units.getUnit() : "mm")
  const updateAreaHeader = () => {
    const header = window.qs("[data-area-header]")
    if (header) header.textContent = getUnit() === "inch" ? "Area (ft²)" : "SQM"
  }
  const downloadOrderExcel = async (order, btn) => {
    if (!order || !order.id) return
    if (btn) {
      btn.disabled = true
      btn.dataset.defaultText = btn.dataset.defaultText || btn.textContent
      btn.textContent = "Exporting..."
    }
    const res = await window.apiFetch(`/orders/${order.id}/export`, { method: "POST" })
    if (!res || !res.ok) {
      let errorCode = ""
      let raw = ""
      try{
        raw = res ? await res.text() : ""
        if (raw) {
          const data = JSON.parse(raw)
          errorCode = data && data.error ? data.error : ""
        }
      }catch(e){}
      const messages = {
        export_config_missing: "未配置导出规则。",
        mapping_rules_empty: "导出映射为空。",
        template_missing: "导出模板不存在。",
        template_unsupported: "模板仅支持 .xlsx 格式。",
        template_invalid: "模板文件无法解析。",
        export_failed: "导出失败，请稍后重试。"
      }
      if (errorCode && messages[errorCode]) {
        alert(messages[errorCode])
      } else if (raw) {
        alert(raw)
      } else if (res && res.status === 500) {
        alert("导出失败，请稍后重试。")
      }
      if (btn) {
        btn.disabled = false
        btn.textContent = btn.dataset.defaultText || "Export Excel"
      }
      return
    }
    const data = await res.json()
    const downloadUrl = data && data.downloadUrl ? data.downloadUrl : ""
    if (!downloadUrl) {
      if (btn) {
        btn.disabled = false
        btn.textContent = btn.dataset.defaultText || "Export Excel"
      }
      return
    }
    const consumeUrl = `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}consume=1`
    const fileRes = await window.apiFetch(consumeUrl)
    if (fileRes && fileRes.ok) {
      const blob = await fileRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${order.orderNo || "order"}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } else {
      alert("导出文件下载失败。")
    }
    if (btn) {
      btn.disabled = false
      btn.textContent = btn.dataset.defaultText || "Export Excel"
    }
  }
  const toDateKey = (value) => {
    if (!value) return ""
    const raw = String(value)
    const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
    const date = new Date(hasZone ? raw : raw)
    if (!Number.isFinite(date.getTime())) return raw.length >= 10 ? raw.slice(0, 10) : raw
    const pad = n => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  const setMarkButtonState = (btn, stateLabel, labels = {}) => {
    if (!btn) return
    if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent.trim()
    if (stateLabel === "loading") {
      btn.textContent = labels.loading || "Saving..."
      btn.classList.add("is-loading")
      btn.classList.remove("is-success")
      btn.disabled = true
      return
    }
    if (stateLabel === "success") {
      btn.textContent = labels.success || "Saved ✓"
      btn.classList.remove("is-loading")
      btn.classList.add("is-success")
      btn.disabled = true
      setTimeout(() => {
        btn.textContent = btn.dataset.defaultText || ""
        btn.classList.remove("is-success")
        btn.disabled = false
      }, 1400)
      return
    }
    btn.textContent = btn.dataset.defaultText || ""
    btn.classList.remove("is-loading", "is-success")
    btn.disabled = false
  }
  if (page === "order-history") {
    const tbody = window.qs("[data-order-list]")
    const searchInput = window.qs("[data-order-search]") || window.qs(".filters input")
    const dateInput = window.qs("[data-order-date]")
    const applyBtn = window.qs("[data-order-apply]")
    const remakeModal = window.qs("[data-remake-modal]")
    const remakeCloseBtns = window.qsa("[data-remake-close]")
    const remakeLineSelect = window.qs("[data-remake-line]")
    const remakeNote = window.qs("[data-remake-note]")
    const remakeFile = window.qs("[data-remake-file]")
    const remakeFileName = window.qs("[data-remake-file-name]")
    const remakeFileClear = window.qs("[data-remake-file-clear]")
    const remakeUploadBox = window.qs("[data-remake-upload-box]")
    const remakeSubmit = window.qs("[data-remake-submit]")
    const remakeError = window.qs("[data-remake-error]")
    const remakeTypes = window.qsa("[data-remake-type]")
    const remakeOrderNo = window.qs("[data-remake-order-no]")
    const pageSize = 20
    let allRows = []
    let currentPage = 1
    let currentOrderId = ""
    const toText = value => String(value || "").toLowerCase()
    const getDateKey = toDateKey
    const matchQuery = (order, query) => {
      if (!query) return true
      const tokens = query.split("*").map(t => t.trim()).filter(Boolean)
      const hay = toText([order.orderNo, order.customerName, order.companyName, order.orderReference, order.po, order.sideMark].join(" "))
      if (tokens.length > 1) return tokens.every(t => hay.includes(toText(t)))
      return hay.includes(toText(query))
    }
    const sortByDate = (a, b) => {
      const aTime = Date.parse(a.date || "") || 0
      const bTime = Date.parse(b.date || "") || 0
      return aTime - bTime
    }
    const ensurePager = () => {
      const card = tbody ? tbody.closest(".table-card") : null
      if (!card) return null
      let pager = card.querySelector(".pagination")
      if (!pager) {
        pager = document.createElement("div")
        pager.className = "pagination"
        pager.innerHTML = `
          <button class="ghost" data-page-prev>Prev</button>
          <div class="page-info" data-page-info></div>
          <button class="ghost" data-page-next>Next</button>
        `
        card.appendChild(pager)
      }
      return pager
    }
    const renderPage = () => {
      if (!tbody) return
      const query = searchInput ? searchInput.value.trim() : ""
      const dateVal = dateInput ? dateInput.value : ""
      let rows = allRows.filter(order => matchQuery(order, query))
      if (dateVal) rows = rows.filter(order => getDateKey(order.date) === dateVal)
      rows = rows.slice().sort(sortByDate)
      const total = rows.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      if (currentPage > totalPages) currentPage = totalPages
      const start = (currentPage - 1) * pageSize
      const pageRows = rows.slice(start, start + pageSize)
      window.renderOrders(pageRows, tbody, "/order-detail.html", { showStatus: true, showActions: true })
      const pager = ensurePager()
      if (pager) {
        const info = pager.querySelector("[data-page-info]")
        const prev = pager.querySelector("[data-page-prev]")
        const next = pager.querySelector("[data-page-next]")
        if (info) info.textContent = `Page ${currentPage} / ${totalPages} · ${total} items`
        if (prev) prev.disabled = currentPage <= 1
        if (next) next.disabled = currentPage >= totalPages
      }
    }
    const bindPager = () => {
      const pager = ensurePager()
      if (!pager) return
      pager.addEventListener("click", e => {
        const prev = e.target.closest("[data-page-prev]")
        const next = e.target.closest("[data-page-next]")
        if (prev && currentPage > 1) { currentPage -= 1; renderPage(); return }
        if (next) { currentPage += 1; renderPage(); return }
      })
    }
    const applyFilters = () => {
      currentPage = 1
      renderPage()
    }
    if (applyBtn) applyBtn.addEventListener("click", applyFilters)
    if (searchInput) {
      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") applyFilters()
      })
    }
    if (dateInput) {
      dateInput.addEventListener("change", applyFilters)
      dateInput.addEventListener("keydown", e => {
        if (e.key === "Enter") applyFilters()
      })
    }
    bindPager()
    if (remakeCloseBtns.length) {
      remakeCloseBtns.forEach(btn => btn.addEventListener("click", () => {
        if (remakeModal) remakeModal.classList.remove("is-open")
      }))
    }
    const syncRemakeFile = () => {
      const name = remakeFile && remakeFile.files && remakeFile.files[0] ? remakeFile.files[0].name : ""
      if (remakeFileName) remakeFileName.textContent = name || "No file selected"
      if (remakeUploadBox) {
        if (name) remakeUploadBox.classList.add("is-selected")
        else remakeUploadBox.classList.remove("is-selected")
      }
    }
    if (remakeFile) remakeFile.addEventListener("change", syncRemakeFile)
    if (remakeFileClear) {
      remakeFileClear.addEventListener("click", () => {
        if (remakeFile) remakeFile.value = ""
        syncRemakeFile()
      })
    }
    if (tbody) {
      tbody.addEventListener("click", (e) => {
        const trigger = e.target.closest("[data-action-trigger]")
        const remakeOpen = e.target.closest("[data-remake-open]")
        const actionMenu = e.target.closest(".action-menu")
        if (trigger) {
          e.preventDefault()
          const menu = trigger.nextElementSibling
          window.qsa(".action-menu").forEach(el => {
            if (el === menu) return
            el.classList.remove("is-open")
          })
          if (menu) menu.classList.toggle("is-open")
          return
        }
        if (remakeOpen) {
          e.preventDefault()
          window.qsa(".action-menu").forEach(el => el.classList.remove("is-open"))
          const orderId = remakeOpen.dataset.orderId || ""
          if (!orderId) return
          currentOrderId = orderId
          if (remakeOrderNo) {
            const row = allRows.find(r => r.id === orderId)
            remakeOrderNo.textContent = row ? `Remake · ${row.orderNo || ""}` : "Remake Request"
          }
          if (remakeNote) remakeNote.value = ""
          if (remakeFile) remakeFile.value = ""
          syncRemakeFile()
          remakeTypes.forEach(cb => { cb.checked = false })
          if (remakeError) remakeError.textContent = ""
          if (remakeLineSelect) {
            remakeLineSelect.innerHTML = `<option value="">Select</option>`
            window.apiFetch(`/orders/${orderId}`).then(res => res ? res.json() : null).then(order => {
              if (!order || !remakeLineSelect) return
              const lines = Array.isArray(order.lines) ? order.lines : []
              lines.forEach((line, index) => {
                const opt = document.createElement("option")
                opt.value = line.id || ""
                opt.textContent = `Shutter #${index + 1} · ${line.room || ""} · ${line.style || ""}`
                remakeLineSelect.appendChild(opt)
              })
            })
          }
          if (remakeModal) remakeModal.classList.add("is-open")
          return
        }
        if (actionMenu) return
        window.qsa(".action-menu").forEach(el => el.classList.remove("is-open"))
      })
    }
    if (remakeSubmit) {
      remakeSubmit.addEventListener("click", async () => {
        const lineId = remakeLineSelect ? remakeLineSelect.value : ""
        const note = remakeNote ? remakeNote.value.trim() : ""
        const types = remakeTypes.filter(cb => cb.checked).map(cb => cb.value)
        if (!currentOrderId || !lineId || !note || types.length === 0) {
          if (remakeError) remakeError.textContent = "Please select shutter, type, and note before submitting."
          return
        }
        if (remakeError) remakeError.textContent = ""
        let fileId = ""
        if (remakeFile && remakeFile.files && remakeFile.files[0]) {
          const form = new FormData()
          form.append("file", remakeFile.files[0])
          const uploadRes = await window.apiFetch("/files/userupload", { method: "POST", body: form })
          if (uploadRes && uploadRes.ok) {
            const data = await uploadRes.json()
            fileId = data.id || ""
          }
        }
        const res = await window.apiFetch("/remakes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: currentOrderId, lineId, types, note, fileId })
        })
        if (res && res.ok) {
          if (remakeModal) remakeModal.classList.remove("is-open")
        }
      })
    }
    window.apiFetch("/orders").then(res => res ? res.json() : null).then(rows => {
      if (!rows) return
      allRows = rows || []
      if (allRows.length === 0) { location.href = "/order-history-empty.html"; return }
      renderPage()
      updateAreaHeader()
    })
    document.addEventListener("unit-change", () => {
      updateAreaHeader()
      renderPage()
    })
    return
  }
  if (page === "admin-order-list") {
    const tbody = window.qs("[data-order-list]")
    const searchInput = window.qs("[data-order-search]") || window.qs(".filters input")
    const dateInput = window.qs("[data-order-date]")
    const applyBtn = window.qs("[data-order-apply]")
    const pageSize = 20
    let allRows = []
    let currentPage = 1
    const toText = value => String(value || "").toLowerCase()
    const getDateKey = toDateKey
    const matchQuery = (order, query) => {
      if (!query) return true
      const tokens = query.split("*").map(t => t.trim()).filter(Boolean)
      const hay = toText([order.orderNo, order.customerName, order.companyName, order.orderReference, order.po, order.sideMark].join(" "))
      if (tokens.length > 1) return tokens.every(t => hay.includes(toText(t)))
      return hay.includes(toText(query))
    }
    const sortByDate = (a, b) => {
      const aTime = Date.parse(a.date || "") || 0
      const bTime = Date.parse(b.date || "") || 0
      return aTime - bTime
    }
    const ensurePager = () => {
      const card = tbody ? tbody.closest(".table-card") : null
      if (!card) return null
      let pager = card.querySelector(".pagination")
      if (!pager) {
        pager = document.createElement("div")
        pager.className = "pagination"
        pager.innerHTML = `
          <button class="ghost" data-page-prev>Prev</button>
          <div class="page-info" data-page-info></div>
          <button class="ghost" data-page-next>Next</button>
        `
        card.appendChild(pager)
      }
      return pager
    }
    const renderPage = () => {
      if (!tbody) return
      const query = searchInput ? searchInput.value.trim() : ""
      const dateVal = dateInput ? dateInput.value : ""
      let rows = allRows.filter(order => matchQuery(order, query))
      if (dateVal) rows = rows.filter(order => getDateKey(order.date) === dateVal)
      rows = rows.slice().sort(sortByDate)
      const total = rows.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      if (currentPage > totalPages) currentPage = totalPages
      const start = (currentPage - 1) * pageSize
      const pageRows = rows.slice(start, start + pageSize)
      window.renderOrders(pageRows, tbody, "/admin-order-detail.html", { showMark: true })
      const pager = ensurePager()
      if (pager) {
        const info = pager.querySelector("[data-page-info]")
        const prev = pager.querySelector("[data-page-prev]")
        const next = pager.querySelector("[data-page-next]")
        if (info) info.textContent = `Page ${currentPage} / ${totalPages} · ${total} items`
        if (prev) prev.disabled = currentPage <= 1
        if (next) next.disabled = currentPage >= totalPages
      }
    }
    const bindPager = () => {
      const pager = ensurePager()
      if (!pager) return
      pager.addEventListener("click", e => {
        const prev = e.target.closest("[data-page-prev]")
        const next = e.target.closest("[data-page-next]")
        if (prev && currentPage > 1) { currentPage -= 1; renderPage(); return }
        if (next) { currentPage += 1; renderPage(); return }
      })
    }
    const applyFilters = () => {
      currentPage = 1
      renderPage()
    }
    if (applyBtn) applyBtn.addEventListener("click", applyFilters)
    if (searchInput) {
      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") applyFilters()
      })
    }
    if (dateInput) {
      dateInput.addEventListener("change", applyFilters)
      dateInput.addEventListener("keydown", e => {
        if (e.key === "Enter") applyFilters()
      })
    }
    bindPager()
    window.apiFetch("/admin/orders").then(res => res ? res.json() : null).then(rows => {
      if (!rows) return
      allRows = rows || []
      renderPage()
    })
    return
  }
  if (page === "order-detail") {
    const id = new URLSearchParams(location.search).get("id")
    if (!id) return
    let currentOrder = null
    const printBtn = window.qs("[data-order-print]")
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print()
      })
    }
    window.apiFetch(`/orders/${id}`).then(res => res ? res.json() : null).then(order => {
      if (order) {
        currentOrder = order
        window.renderOrderDetail(order, true)
      }
    })
    document.addEventListener("unit-change", () => {
      if (currentOrder) window.renderOrderDetail(currentOrder, true)
    })
    return
  }
  if (page === "admin-order-detail") {
    const id = new URLSearchParams(location.search).get("id")
    if (!id) return
    let currentOrder = null
    const exportBtn = window.qs("[data-order-export]")
    const printBtn = window.qs("[data-order-print]")
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print()
      })
    }
    window.apiFetch(`/admin/orders/${id}`).then(res => res ? res.json() : null).then(order => {
      if (order) {
        currentOrder = order
        window.renderOrderDetail(order, false)
        if (exportBtn) exportBtn.onclick = () => downloadOrderExcel(order, exportBtn)
        const markInput = window.qs("[data-order-mark]")
        const markSave = window.qs("[data-order-mark-save]")
        if (markInput) markInput.value = order.mark || ""
        if (markSave) {
          markSave.onclick = async () => {
            setMarkButtonState(markSave, "loading")
            let ok = false
            try {
              const res = await window.apiFetch(`/admin/orders/${order.id}/mark`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mark: markInput ? markInput.value : "" })
              })
              ok = !!(res && res.ok)
            } catch (e) {
            }
            if (ok) setMarkButtonState(markSave, "success", { success: "Saved ✓" })
            else setMarkButtonState(markSave, "default")
          }
        }
      }
    })
    document.addEventListener("unit-change", () => {
      if (currentOrder) window.renderOrderDetail(currentOrder, false)
    })
    return
  }
}
