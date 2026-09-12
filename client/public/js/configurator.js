window.configuratorInit = () => {
  const state = { style: "", product: "Hollow", panelConfig: "", width: "", height: "" }
  const selection = { louvresSize: "", stile: "", tpost: "", frameType: "" }
  let frameDataByName = new Map()
  let frameIdByName = new Map()
  let selectedFrameDataRaw = ""
  let selectedFrameId = ""
  const toNumber = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const page = document.body.getAttribute("data-page") || ""
  const isOrderLineEdit = page === "order-line-edit"
  const draftKey = isOrderLineEdit ? "order_line_edit_draft" : "configurator_draft"
  const imageCache = new Map()
  const apiBase = (() => {
    const metaBase = document.querySelector("meta[name='api-base']")
    const baseFromMeta = metaBase && metaBase.content ? metaBase.content : ""
    const baseFromWindow = window.API_BASE || ""
    const base = baseFromMeta || baseFromWindow || ""
    return base ? base : (location.port && location.port !== "3000" ? "http://localhost:3000" : "")
  })()
  const units = window.units || {}
  const getUnit = () => (units.getUnit ? units.getUnit() : "mm")
  const isInch = () => getUnit() === "inch"
  const AVAILABLE_MOUNTS = ["IM", "OM", "N.W.F"]
  const AREA_RULES = ["add", "subtract"]
  const panelConfigRules = window.panelConfigRules || {}
  const LOUVER_OPENING_MODES = ["None", "1way", "2way", "Both"]
  let currentLouverOpeningMode = "Both"
  const normalizeLouverOpeningMode = (value) => {
    const raw = String(value || "").trim().toLowerCase()
    if (raw === "none") return "None"
    if (raw === "1way") return "1way"
    if (raw === "2way") return "2way"
    return "Both"
  }
  const getAllowedLouverOpenings = (mode = currentLouverOpeningMode) => {
    const normalized = normalizeLouverOpeningMode(mode)
    if (normalized === "None") return []
    if (normalized === "1way") return ["1way"]
    if (normalized === "2way") return ["2way"]
    return ["1way", "2way"]
  }
  const getLouverOpeningRow = () => window.qs('.option-row[data-field="Louver Opening"]')
  const getActiveLouverOpening = () => {
    const row = getLouverOpeningRow()
    if (!row) return ""
    const active = row.querySelector(".toggle.active")
    return active ? String(active.textContent || "").trim() : ""
  }
  const setLouverOpeningValue = (value) => {
    const row = getLouverOpeningRow()
    if (!row) return false
    const target = String(value || "").trim()
    if (!target || !LOUVER_OPENING_MODES.includes(target)) return false
    const btn = Array.from(row.querySelectorAll(".toggle")).find(item => item.textContent.trim() === target)
    if (!btn) return false
    window.setToggleActive(btn)
    return true
  }
  const getLouverOpeningWarningText = () => {
    const allowed = getAllowedLouverOpenings()
    if (allowed.length === 1) return `This material only supports ${allowed[0]}.`
    return ""
  }
  const applyLouverOpeningRule = (options = {}) => {
    const warn = !!options.warn
    const row = getLouverOpeningRow()
    if (!row) return true
    const allowed = getAllowedLouverOpenings()
    if (currentLouverOpeningMode === "None") {
      row.style.display = "none"
      setAddHint("")
      return true
    }
    row.style.display = ""
    const active = getActiveLouverOpening()
    const preferred = allowed[0] || "1way"
    let changed = false
    if (currentLouverOpeningMode === "1way" || currentLouverOpeningMode === "2way") {
      if (active !== preferred) {
        changed = setLouverOpeningValue(preferred)
      }
    } else if (active !== preferred) {
      changed = setLouverOpeningValue(preferred)
    }
    if (warn && changed) {
      const message = getLouverOpeningWarningText()
      if (message) setAddHint(message)
      shakeElement(row)
    }
    return allowed.includes(getActiveLouverOpening())
  }
  const formatNumber = (num) => {
    if (!Number.isFinite(num)) return ""
    return String(parseFloat(num.toFixed(2)))
  }
  const normalizeAreaRule = (value) => {
    const raw = String(value || "").trim().toLowerCase()
    return AREA_RULES.includes(raw) ? raw : ""
  }
  const parseFrameDataParts = (value) => {
    const raw = String(value || "").trim()
    if (!raw) return { add: 0, subtract: 0 }
    if (!raw.includes("/")) {
      const add = toNumber(raw)
      return { add, subtract: 0 }
    }
    const [addRaw = "", subtractRaw = ""] = raw.split("/", 2)
    return { add: toNumber(addRaw), subtract: toNumber(subtractRaw) }
  }
  const toMmNumber = (value) => {
    const n = toNumber(value)
    if (!n && String(value).trim() !== "0") return 0
    return isInch() ? n * 25.4 : n
  }
  const toMmString = (value) => {
    const n = toNumber(value)
    if (!n && String(value).trim() !== "0") return ""
    const mm = isInch() ? n * 25.4 : n
    return formatNumber(mm)
  }
  const formatInputValue = (mmValue) => {
    const n = toNumber(mmValue)
    if (!n && String(mmValue).trim() !== "0") return ""
    const v = isInch() ? n / 25.4 : n
    return formatNumber(v)
  }
  const roundMmForCurrentUnit = (mmValue) => {
    const n = toNumber(mmValue)
    if (!n && String(mmValue).trim() !== "0") return ""
    if (!isInch()) return formatNumber(n)
    const inches = n / 25.4
    const roundedInches = Math.round(inches * 16) / 16
    return formatNumber(roundedInches * 25.4)
  }
  const formatLengthLabel = (mmValue) => {
    const n = toNumber(mmValue)
    if (!n && String(mmValue).trim() !== "0") return "-"
    const v = isInch() ? n / 25.4 : n
    const suffix = isInch() ? "in" : "mm"
    return `${formatNumber(v)}${suffix}`
  }
  const getInputMmValue = (input) => {
    if (!input) return ""
    if (input.dataset.mmValue !== undefined) return input.dataset.mmValue
    return toMmString(input.value)
  }
  const syncInputMmValue = (input) => {
    if (!input) return
    input.dataset.mmValue = toMmString(input.value)
  }
  const updateUnitLabels = () => {
    window.qsa("[data-unit-label]").forEach(el => {
      el.textContent = isInch() ? "in" : "mm"
    })
  }
  const refreshUnitInputs = () => {
    window.qsa('input[type="number"]:not(.inch-int):not([data-no-unit="1"])').forEach(input => {
      if (input.dataset.mmValue !== undefined) {
        input.value = formatInputValue(input.dataset.mmValue)
      }
      if (isInch()) {
        ensureInchInput(input)
        syncCompositeInput(input)
      }
    })
  }
  const fractionOptions = [
    { label: "0", value: 0 },
    { label: "1/16", value: 1 / 16 },
    { label: "1/8", value: 1 / 8 },
    { label: "3/16", value: 3 / 16 },
    { label: "1/4", value: 1 / 4 },
    { label: "5/16", value: 5 / 16 },
    { label: "3/8", value: 3 / 8 },
    { label: "7/16", value: 7 / 16 },
    { label: "1/2", value: 1 / 2 },
    { label: "9/16", value: 9 / 16 },
    { label: "5/8", value: 5 / 8 },
    { label: "11/16", value: 11 / 16 },
    { label: "3/4", value: 3 / 4 },
    { label: "13/16", value: 13 / 16 },
    { label: "7/8", value: 7 / 8 },
    { label: "15/16", value: 15 / 16 }
  ]
  const inchInputMap = new Map()
  const buildFractionSelect = () => {
    const select = document.createElement("select")
    select.className = "inch-frac"
    fractionOptions.forEach(opt => {
      const option = document.createElement("option")
      option.value = String(opt.value)
      option.textContent = opt.label
      select.appendChild(option)
    })
    return select
  }
  const ensureInchInput = (input) => {
    if (inchInputMap.has(input)) return inchInputMap.get(input)
    input.dataset.inchSource = "1"
    const wrap = document.createElement("div")
    wrap.className = "inch-input is-hidden"
    const intInput = document.createElement("input")
    intInput.type = "number"
    intInput.min = "0"
    intInput.step = "1"
    intInput.className = "inch-int"
    if (input.placeholder) intInput.placeholder = input.placeholder
    const fracSelect = buildFractionSelect()
    wrap.appendChild(intInput)
    wrap.appendChild(fracSelect)
    input.insertAdjacentElement("afterend", wrap)
    const updateOriginal = () => {
      const intRaw = String(intInput.value || "").trim()
      const intVal = intRaw === "" ? 0 : toNumber(intRaw)
      const fracVal = parseFloat(fracSelect.value || "0") || 0
      if (intRaw === "" && fracVal === 0) {
        input.value = ""
      } else {
        const total = intVal + fracVal
        input.value = formatNumber(total)
      }
      input.dispatchEvent(new Event("input", { bubbles: true }))
      validateInput(input)
      setAddHint("")
    }
    intInput.addEventListener("input", updateOriginal)
    fracSelect.addEventListener("change", updateOriginal)
    const entry = { wrap, intInput, fracSelect }
    inchInputMap.set(input, entry)
    return entry
  }
  const syncCompositeInput = (input) => {
    const entry = inchInputMap.get(input)
    if (!entry) return
    const raw = String(input.value || "").trim()
    if (!raw) {
      entry.intInput.value = ""
      entry.fracSelect.value = "0"
      return
    }
    const value = toNumber(raw)
    const whole = Math.floor(value)
    const frac = value - whole
    let best = fractionOptions[0]
    let bestDelta = Math.abs(frac - best.value)
    fractionOptions.forEach(opt => {
      const delta = Math.abs(frac - opt.value)
      if (delta < bestDelta) {
        best = opt
        bestDelta = delta
      }
    })
    entry.intInput.value = whole ? String(whole) : "0"
    entry.fracSelect.value = String(best.value)
  }
  const applyUnitMode = () => {
    const isInchMode = isInch()
    window.qsa('input[type="number"]:not(.inch-int):not([data-no-unit="1"])').forEach(input => {
      if (isInchMode) {
        const entry = ensureInchInput(input)
        input.classList.add("inch-hidden")
        input.style.display = "none"
        entry.wrap.classList.remove("is-hidden")
        syncCompositeInput(input)
      } else {
        input.classList.remove("inch-hidden")
        input.style.display = ""
        const entry = inchInputMap.get(input)
        if (entry && entry.wrap && entry.wrap.parentNode) {
          entry.wrap.parentNode.removeChild(entry.wrap)
        }
        inchInputMap.delete(input)
      }
    })
  }

  const getSelectedAreaRuleByConfig = () => {
    const mountSelect = getMountSelect()
    const selectedMount = String(mountSelect && mountSelect.value || "").trim().toUpperCase()
    if (!selectedMount || !AVAILABLE_MOUNTS.includes(selectedMount)) return ""
    const profileId = selectedFrameId || String(frameIdByName.get(selection.frameType) || "")
    if (!profileId) return ""
    const areaMountMap = companyConfig.profileAreaMountMap && typeof companyConfig.profileAreaMountMap === "object"
      ? companyConfig.profileAreaMountMap
      : {}
    const profileRules = areaMountMap[profileId]
    if (Array.isArray(profileRules)) {
      const mountList = profileRules.map(v => String(v || "").trim().toUpperCase()).filter(v => AVAILABLE_MOUNTS.includes(v))
      return mountList.includes(selectedMount) ? "add" : ""
    }
    if (!profileRules || typeof profileRules !== "object") return ""
    return normalizeAreaRule(profileRules[selectedMount])
  }
  const getSelectedFrameDataRaw = () => {
    if (selection.frameType) {
      const value = frameDataByName.get(selection.frameType)
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value)
    }
    return String(selectedFrameDataRaw || "")
  }
  const getEffectiveDimensionsMm = () => {
    const width = toNumber(state.width)
    const height = toNumber(state.height)
    const areaRule = getSelectedAreaRuleByConfig()
    if (!areaRule) return { width, height }
    const frameDataParts = parseFrameDataParts(getSelectedFrameDataRaw())
    const frameDelta = areaRule === "subtract" ? -frameDataParts.subtract : frameDataParts.add
    const left = window.qs('[data-frame-side="left"]')
    const right = window.qs('[data-frame-side="right"]')
    const top = window.qs('[data-frame-side="top"]')
    const bottom = window.qs('[data-frame-side="bottom"]')
    const addWidth = (left && left.checked ? frameDelta : 0) + (right && right.checked ? frameDelta : 0)
    const addHeight = (top && top.checked ? frameDelta : 0) + (bottom && bottom.checked ? frameDelta : 0)
    return { width: Math.max(width + addWidth, 0), height: Math.max(height + addHeight, 0) }
  }
  const getSqmValue = () => {
    const size = getEffectiveDimensionsMm()
    return ((size.width * size.height) / 1000000).toFixed(2)
  }
  const updateSqm = () => {
    const sqm = getSqmValue()
    const sqmInput = window.qs("[data-sqm-input]")
    const sqmLabel = window.qs("[data-sqm]")
    const areaText = units.formatAreaFromSqm ? units.formatAreaFromSqm(sqm, getUnit()) : sqm
    if (sqmInput) sqmInput.textContent = areaText
    if (sqmLabel) {
      const label = units.areaLabel ? units.areaLabel(getUnit()) : "㎡"
      sqmLabel.textContent = `${areaText}${label}`
    }
  }

  const updatePreview = () => {
    const roomInput = window.qs("#general input[type='text']")
    const roomValue = roomInput ? roomInput.value : ""
    const roomLabel = window.qs("[data-preview-room]")
    const productLabel = window.qs("[data-preview-product]")
    const styleLabel = window.qs("[data-preview-style]")
    const panelLabel = window.qs("[data-preview-panel]")
    const previewWidth = window.qs("[data-preview-width]")
    const previewHeight = window.qs("[data-preview-height]")
    const panelDisplay = window.qs("[data-preview-panel-label]")
    const box = window.qs(".preview-box")
    const productText = window.materialCatalog && typeof window.materialCatalog.getLabelSync === "function"
      ? window.materialCatalog.getLabelSync(state.product)
      : (state.product || "")
    if (roomLabel) roomLabel.textContent = roomValue || "-"
    if (productLabel) productLabel.textContent = productText || "-"
    if (styleLabel) styleLabel.textContent = state.style || "-"
    if (panelLabel) {
      const panel = state.panelConfig || ""
      panelLabel.textContent = panel ? panel.split("").join(" ") : "-"
    }
    if (previewWidth) previewWidth.textContent = state.width ? formatLengthLabel(state.width) : "-"
    if (previewHeight) previewHeight.textContent = state.height ? formatLengthLabel(state.height) : "-"
    if (panelDisplay) {
      const panel = (state.panelConfig || "").toUpperCase()
      panelDisplay.textContent = panel ? panel : "-"
    }
    if (box) renderShutterPreview(box)
  }

  const tokenizePanelConfig = (panel = state.panelConfig, style = state.style) => (
    typeof panelConfigRules.tokenizePanelConfig === "function"
      ? panelConfigRules.tokenizePanelConfig(panel, style)
      : String(panel || "").toUpperCase().trim().split("").filter(c => /[LTRFMBT]/.test(c))
  )

  const getStructuralPosts = (panel = state.panelConfig, style = state.style) => (
    typeof panelConfigRules.getStructuralPosts === "function"
      ? panelConfigRules.getStructuralPosts(panel, style)
      : []
  )

  const getBPostSequences = (panel = state.panelConfig, style = state.style) => (
    typeof panelConfigRules.getBPostSequences === "function"
      ? panelConfigRules.getBPostSequences(panel, style)
      : []
  )

  const supportsExtendedStructuralPosts = (style = state.style) => (
    typeof panelConfigRules.supportsExtendedStructuralPosts === "function"
      ? panelConfigRules.supportsExtendedStructuralPosts(style)
      : false
  )

  const parsePanelTokens = () => {
    return tokenizePanelConfig()
  }

  const getPostPositions = () => {
    const values = []
    window.qsa("[data-post-position]").forEach(input => {
      const v = toNumber(getInputMmValue(input))
      if (v > 0) values.push(v)
    })
    return values.sort((a, b) => a - b)
  }

  const getMidRailPositions = () => {
    const values = []
    const inputs = [
      window.qs('[data-field="MID RAIL 1"]'),
      window.qs('[data-field="MID RAIL 2"]')
    ]
    inputs.forEach(input => {
      if (!input) return
      const v = toNumber(getInputMmValue(input))
      if (v > 0) values.push(v)
    })
    return values.sort((a, b) => a - b)
  }

  const getFrameSides = () => {
    const get = (key) => {
      const el = window.qs(`[data-frame-side="${key}"]`)
      return !!(el && el.checked)
    }
    return { left: get("left"), right: get("right"), top: get("top"), bottom: get("bottom") }
  }

  const buildSegmentsFromPanel = () => {
    const tokens = parsePanelTokens()
    const letters = typeof panelConfigRules.getPanelLetters === "function"
      ? panelConfigRules.getPanelLetters(state.panelConfig, state.style)
      : tokens.filter(t => t !== "T")
    const postCount = getStructuralPosts().length
    const panelCount = Math.max(letters.length || 0, postCount + 1, 1)
    const post = getPostPositions()
    const width = toNumber(state.width)
    const weights = []
    const targetCount = panelCount - 1
    if (width > 0 && post.length >= targetCount && targetCount > 0) {
      const points = [0, ...post.slice(0, targetCount), width].filter(n => Number.isFinite(n)).sort((a, b) => a - b)
      for (let i = 0; i < points.length - 1; i += 1) weights.push(Math.max(1, points[i + 1] - points[i]))
    } else {
      for (let i = 0; i < panelCount; i += 1) weights.push(1)
    }
    const label = tokens.join("")
    return { segments: weights, label, letters }
  }

  const renderShutterPreview = (root) => {
    root.innerHTML = ""
    const w = Math.max(1, toNumber(state.width))
    const h = Math.max(1, toNumber(state.height))
    const aspect = w / h
    const viewW = 220
    const viewH = Math.round(viewW / (aspect || 1)) || 220
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`)
    svg.setAttribute("width", "100%")
    svg.setAttribute("height", "100%")
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet")

    const frame = getFrameSides()
    const margin = 10
    const outerX = margin
    const outerY = margin
    const outerW = viewW - margin * 2
    const outerH = viewH - margin * 2
    const stroke = "#2a2f33"
    const fill = "#f9fbfc"
    const innerPad = 6

    const outer = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    outer.setAttribute("x", String(outerX))
    outer.setAttribute("y", String(outerY))
    outer.setAttribute("width", String(outerW))
    outer.setAttribute("height", String(outerH))
    outer.setAttribute("fill", fill)
    outer.setAttribute("rx", "10")
    outer.setAttribute("ry", "10")
    outer.setAttribute("stroke", "transparent")
    svg.appendChild(outer)

    const drawSide = (x1, y1, x2, y2) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
      line.setAttribute("x1", String(x1))
      line.setAttribute("y1", String(y1))
      line.setAttribute("x2", String(x2))
      line.setAttribute("y2", String(y2))
      line.setAttribute("stroke", stroke)
      line.setAttribute("stroke-width", "4")
      line.setAttribute("stroke-linecap", "round")
      svg.appendChild(line)
    }
    if (frame.top) drawSide(outerX + 6, outerY + 2, outerX + outerW - 6, outerY + 2)
    if (frame.bottom) drawSide(outerX + 6, outerY + outerH - 2, outerX + outerW - 6, outerY + outerH - 2)
    if (frame.left) drawSide(outerX + 2, outerY + 6, outerX + 2, outerY + outerH - 6)
    if (frame.right) drawSide(outerX + outerW - 2, outerY + 6, outerX + outerW - 2, outerY + outerH - 6)

    const { segments, letters } = buildSegmentsFromPanel()
    const totalWeight = segments.reduce((s, v) => s + v, 0) || 1
    const innerX = outerX + innerPad
    const innerY = outerY + innerPad
    const innerW = outerW - innerPad * 2
    const innerH = outerH - innerPad * 2
    let x = innerX

    const midRails = getMidRailPositions()
    const midYs = midRails.map(value => {
      if (value <= 0 || h <= 0) return 0
      const ratio = Math.min(1, Math.max(0, value / h))
      return innerY + innerH * ratio
    }).filter(Boolean)

    const drawSlats = (x0, y0, w0, h0) => {
      const slatCount = 7
      for (let i = 1; i <= slatCount; i += 1) {
        const yy = y0 + (h0 * i) / (slatCount + 1)
        const slat = document.createElementNS("http://www.w3.org/2000/svg", "line")
        slat.setAttribute("x1", String(x0 + 6))
        slat.setAttribute("y1", String(yy))
        slat.setAttribute("x2", String(x0 + w0 - 6))
        slat.setAttribute("y2", String(yy))
        slat.setAttribute("stroke", "#9aa3ad")
        slat.setAttribute("stroke-width", "1.5")
        svg.appendChild(slat)
      }
    }

    const drawPanelShape = (x0, y0, w0, h0, fillColor) => {
      const panel = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      panel.setAttribute("x", String(x0))
      panel.setAttribute("y", String(y0))
      panel.setAttribute("width", String(w0))
      panel.setAttribute("height", String(h0))
      panel.setAttribute("fill", fillColor)
      panel.setAttribute("stroke", stroke)
      panel.setAttribute("stroke-width", "2")
      svg.appendChild(panel)
    }

    const drawMidRail = (x0, w0) => {
      if (!midYs.length) return
      midYs.forEach(midY => {
        const rail = document.createElementNS("http://www.w3.org/2000/svg", "line")
        rail.setAttribute("x1", String(x0 + 2))
        rail.setAttribute("y1", String(midY))
        rail.setAttribute("x2", String(x0 + w0 - 2))
        rail.setAttribute("y2", String(midY))
        rail.setAttribute("stroke", stroke)
        rail.setAttribute("stroke-width", "3")
        svg.appendChild(rail)
      })
    }

    const drawPosts = (x0, w0, idx) => {
      if (idx < segments.length - 1) {
        const post = document.createElementNS("http://www.w3.org/2000/svg", "line")
        post.setAttribute("x1", String(x0 + w0))
        post.setAttribute("y1", String(innerY))
        post.setAttribute("x2", String(x0 + w0))
        post.setAttribute("y2", String(innerY + innerH))
        post.setAttribute("stroke", stroke)
        post.setAttribute("stroke-width", "4")
        svg.appendChild(post)
      }
    }

    const style = state.style || ""
    const panelLetters = letters.length ? letters : segments.map(() => "")
    const drawLetter = (x0, w0, letter) => {
      if (!letter) return
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
      text.setAttribute("x", String(x0 + w0 / 2))
      text.setAttribute("y", String(innerY + innerH + 14))
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("font-size", "10")
      text.setAttribute("fill", "#10302b")
      text.setAttribute("font-weight", "700")
      text.textContent = letter
      svg.appendChild(text)
    }

    if (style === "Cafe") {
      const splitY = innerY + innerH * 0.5
      segments.forEach((seg, idx) => {
        const segW = (innerW * seg) / totalWeight
        const x0 = innerX + segments.slice(0, idx).reduce((s, v) => s + (innerW * v) / totalWeight, 0)
        drawPanelShape(x0, splitY, segW, innerH - (splitY - innerY), "#ffffff")
        drawSlats(x0, splitY, segW, innerH - (splitY - innerY))
        drawPosts(x0, segW, idx)
        drawMidRail(x0, segW)
        drawLetter(x0, segW, panelLetters[idx] || "")
      })
      const splitLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      splitLine.setAttribute("x1", String(innerX))
      splitLine.setAttribute("y1", String(splitY))
      splitLine.setAttribute("x2", String(innerX + innerW))
      splitLine.setAttribute("y2", String(splitY))
      splitLine.setAttribute("stroke", stroke)
      splitLine.setAttribute("stroke-width", "3")
      svg.appendChild(splitLine)
      root.appendChild(svg)
      return
    }

    if (style === "Tier on Tier") {
      const splitY = innerY + innerH * 0.5
      segments.forEach((seg, idx) => {
        const segW = (innerW * seg) / totalWeight
        const x0 = innerX + segments.slice(0, idx).reduce((s, v) => s + (innerW * v) / totalWeight, 0)
        drawPanelShape(x0, innerY, segW, splitY - innerY, "#ffffff")
        drawPanelShape(x0, splitY, segW, innerH - (splitY - innerY), "#ffffff")
        drawSlats(x0, innerY, segW, splitY - innerY)
        drawSlats(x0, splitY, segW, innerH - (splitY - innerY))
        drawPosts(x0, segW, idx)
        drawMidRail(x0, segW)
        drawLetter(x0, segW, panelLetters[idx] || "")
      })
      const splitLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      splitLine.setAttribute("x1", String(innerX))
      splitLine.setAttribute("y1", String(splitY))
      splitLine.setAttribute("x2", String(innerX + innerW))
      splitLine.setAttribute("y2", String(splitY))
      splitLine.setAttribute("stroke", stroke)
      splitLine.setAttribute("stroke-width", "3")
      svg.appendChild(splitLine)
      root.appendChild(svg)
      return
    }

    if (style === "Bi-Fold Track") {
      segments.forEach((seg, idx) => {
        const segW = (innerW * seg) / totalWeight
        const x0 = innerX + segments.slice(0, idx).reduce((s, v) => s + (innerW * v) / totalWeight, 0)
        drawPanelShape(x0, innerY, segW, innerH, "#ffffff")
        drawSlats(x0, innerY, segW, innerH)
        drawMidRail(x0, segW)
        drawPosts(x0, segW, idx)
        drawLetter(x0, segW, panelLetters[idx] || "")
      })
      root.appendChild(svg)
      return
    }

    if (style === "Bypass Track" && segments.length >= 3) {
      const segW = innerW / 3
      const back = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      back.setAttribute("x", String(innerX + segW * 0.5))
      back.setAttribute("y", String(innerY + 4))
      back.setAttribute("width", String(segW))
      back.setAttribute("height", String(innerH - 8))
      back.setAttribute("fill", "#eef3f7")
      back.setAttribute("stroke", stroke)
      back.setAttribute("stroke-width", "2")
      svg.appendChild(back)
      drawPanelShape(innerX, innerY, segW, innerH, "#ffffff")
      drawPanelShape(innerX + segW, innerY, segW, innerH, "#ffffff")
      drawPanelShape(innerX + segW * 2, innerY, segW, innerH, "#ffffff")
      drawSlats(innerX, innerY, segW, innerH)
      drawSlats(innerX + segW, innerY, segW, innerH)
      drawSlats(innerX + segW * 2, innerY, segW, innerH)
      drawLetter(innerX, segW, panelLetters[0] || "")
      drawLetter(innerX + segW, segW, panelLetters[1] || "")
      drawLetter(innerX + segW * 2, segW, panelLetters[2] || "")
      root.appendChild(svg)
      return
    }

    segments.forEach((seg, idx) => {
      const segW = (innerW * seg) / totalWeight
      const openLetter = panelLetters[idx] || ""
      drawPanelShape(x, innerY, segW, innerH, "#ffffff")
      drawSlats(x, innerY, segW, innerH)
      drawMidRail(x, segW)
      drawPosts(x, segW, idx)
      drawLetter(x, segW, openLetter)
      x += segW
    })

    root.appendChild(svg)
  }

  const countT = (panel) => {
    return getStructuralPosts(panel, state.style).length
  }

  const updatePostPositions = (panel) => {
    const t = countT(panel)
    window.qsa("[data-post-position]").forEach((el, index) => {
      const visible = index < t
      const cell = el.closest("[data-post-cell]")
      if (cell) cell.style.display = visible ? "" : "none"
      else el.style.display = visible ? "" : "none"
      const entry = inchInputMap.get(el)
      if (entry && entry.wrap) {
        entry.wrap.style.display = visible && isInch() ? "" : "none"
      }
      if (!visible) {
        el.value = ""
        if (el.dataset.mmValue !== undefined) el.dataset.mmValue = ""
      }
    })
    window.qsa("[data-post-group]").forEach(group => {
      group.style.display = t > 0 ? "" : "none"
    })
    const bPostSequences = new Set(getBPostSequences(panel, state.style))
    window.qsa("[data-angle-position]").forEach((input, index) => {
      const wrap = input.closest("[data-angle-wrap]")
      const visible = bPostSequences.has(index + 1)
      if (wrap) wrap.classList.toggle("is-visible", visible)
      else input.style.display = visible ? "" : "none"
      if (visible) {
        if (!String(input.value || "").trim()) input.value = "135"
      } else if (input.value) {
        input.value = ""
      }
      const field = input.closest("[data-inline-field]") || input.closest(".form-field")
      if (!visible && field) setFieldError(field, "")
    })
  }

  const panelValid = () => {
    if (typeof panelConfigRules.validatePanelConfig !== "function") return false
    return panelConfigRules.validatePanelConfig(state.panelConfig, state.style).ok
  }

  const getDrawingElements = () => {
    const input = window.qs("[data-drawing-upload]")
    if (!input) return {}
    const field = input.closest(".form-field")
    const fileLabel = field ? field.querySelector("[data-drawing-filename]") : null
    const browseBtn = field ? field.querySelector("[data-drawing-browse]") : null
    const clearBtn = field ? field.querySelector("[data-drawing-clear]") : null
    let hint = field ? field.querySelector("[data-drawing-hint]") : null
    if (!hint && field) {
      hint = document.createElement("div")
      hint.className = "drawing-hint"
      hint.dataset.drawingHint = "1"
      field.appendChild(hint)
    }
    return { input, hint, fileLabel, browseBtn, clearBtn }
  }
  const updateDrawingHint = (text = "") => {
    const { input, hint, fileLabel, clearBtn } = getDrawingElements()
    if (!input || !hint) return
    const name = text || input.dataset.uploadedName || (input.files && input.files[0] ? input.files[0].name : "")
    if (name) {
      hint.textContent = name
    } else {
      hint.textContent = state.style === "Shape" ? "Upload drawing file (PDF/PNG/JPG)" : "No file selected"
    }
    if (fileLabel) fileLabel.textContent = name || "No file selected"
    if (clearBtn) clearBtn.disabled = !(name || input.dataset.uploadedId)
  }
  const uploadDrawingFile = async (file) => {
    const { input } = getDrawingElements()
    if (!input || !file) return false
    updateDrawingHint("Uploading...")
    const formData = new FormData()
    formData.append("file", file)
    const res = await window.apiFetch("/files/userupload", { method: "POST", body: formData })
    if (res && res.ok) {
      const data = await res.json()
      input.dataset.uploadedName = data.fileName || file.name || ""
      input.dataset.uploadedId = data.id || ""
      updateDrawingHint()
      return true
    }
    updateDrawingHint()
    return false
  }

  const shouldShowTPost = () => /T/i.test(String(state.panelConfig || "").trim())

  const updateRules = () => {
    const hasStyle = !!state.style
    window.setDisabled("[data-lock=after-style]", !hasStyle)
    const trackOption = window.qs("[data-track-option]")
    const slidingOption = window.qs("[data-sliding-option]")
    const shapeSection = window.qs("[data-shape-section]")
    const allowHint = window.qs("[data-allow-hint]")
    const drawingHint = window.qs("[data-drawing-hint]")
    const tierOnTierGroup = window.qs("[data-tier-on-tier]")
    const othersSection = window.qs("[data-others-section]")
    const othersLink = window.qs("[data-others-link]")
    const tpostBlock = window.qs("[data-tpost-block]")
    const tpostContainer = window.qs('[data-profile-list="TPost"]')
    const horizontalTpostRow = window.qs('.option-row[data-field="Horizontal Tpost"]')
    const horizontalTpostField = horizontalTpostRow ? horizontalTpostRow.closest(".form-field") : null
    const showTPost = shouldShowTPost()
    updatePostPositions(state.panelConfig)
    if (trackOption) trackOption.style.display = state.style === "Bi-Fold Track" || state.style === "Bypass Track" ? "" : "none"
    if (slidingOption) slidingOption.style.display = state.style === "Bi-Fold Track" ? "" : "none"
    if (shapeSection) shapeSection.style.display = state.style === "Shape" ? "" : "none"
    if (tierOnTierGroup) tierOnTierGroup.style.display = state.style === "Tier on Tier" ? "" : "none"
    const hasOthers = state.style === "Bi-Fold Track" || state.style === "Bypass Track" || state.style === "Shape"
    if (othersSection) othersSection.style.display = hasOthers ? "" : "none"
    if (othersLink) othersLink.style.display = hasOthers ? "" : "none"
    if (tpostBlock) tpostBlock.style.display = showTPost ? "" : "none"
    if (!showTPost && tpostContainer) setBlockError(tpostContainer, "")
    if (horizontalTpostRow) {
      const forceHideHorizontalTpost = state.style === "Full Height"
      const noBtn = Array.from(horizontalTpostRow.querySelectorAll(".toggle")).find(btn => btn.textContent.trim() === "NO")
      if (forceHideHorizontalTpost && noBtn) window.setToggleActive(noBtn)
      horizontalTpostRow.querySelectorAll(".toggle").forEach(btn => {
        btn.disabled = forceHideHorizontalTpost || !hasStyle
        btn.classList.toggle("is-disabled", forceHideHorizontalTpost || !hasStyle)
      })
      if (horizontalTpostField) horizontalTpostField.style.display = forceHideHorizontalTpost ? "none" : ""
      setBlockError(horizontalTpostRow, "")
    }
    const addBtn = window.qs("[data-add-cart]")
    if (addBtn && !addBtn.classList.contains("is-loading")) addBtn.disabled = false
    if (allowHint) {
      if (state.style === "Bypass Track") allowHint.textContent = "Allow: F (Front), M (Middle), B (Behind)"
      else if (supportsExtendedStructuralPosts(state.style)) allowHint.textContent = "Allow: L (Left), T/B/C (Post), R (Right)"
      else allowHint.textContent = "Allow: L (Left), T (T-Post), R (Right)"
    }
    if (drawingHint) {
      if (state.style === "Shape") {
        drawingHint.style.display = ""
        const { input } = getDrawingElements()
        if (input) input.setAttribute("lang","en")
        updateDrawingHint()
      } else {
        drawingHint.style.display = "none"
      }
    }

    const topSide = window.qs('[data-frame-side="top"]')
    if (topSide) {
      if (!hasStyle) {
        topSide.disabled = true
      } else if (state.style === "Café style") {
        topSide.checked = false
        topSide.disabled = true
      } else {
        topSide.disabled = false
      }
    }
    const sides = {
      left: window.qs('[data-frame-side="left"]'),
      right: window.qs('[data-frame-side="right"]'),
      top: window.qs('[data-frame-side="top"]'),
      bottom: window.qs('[data-frame-side="bottom"]')
    }
    const toggleDeps = (key) => {
      const enabled = !!(sides[key] && sides[key].checked)
      const c = window.qs(`[data-cilplate="${key}"]`)
      const b = window.qs(`[data-build-up="${key}"]`)
      if (c) c.disabled = !enabled
      if (b) b.disabled = !enabled
    }
    Object.keys(sides).forEach(toggleDeps)
  }

  const labelKeyMap = {
    "Critical Mid Rail": "criticalMidRail",
    "Horizontal Tpost": "horizontalTpost",
    "TILT OPTION": "tiltOption",
    "MID RAIL 1": "midRail1",
    "MID RAIL 2": "midRail2",
    "SPLIT 1": "split1",
    "SPLIT 2": "split2",
    "TIER ON TIER 1": "tierOnTier1",
    "TIER ON TIER 2": "tierOnTier2",
    "First Panel Opening": "firstPanelOpening",
    "Post Position 1": "postPosition1",
    "Post Position 2": "postPosition2",
    "Post Position 3": "postPosition3",
    "Post Position 4": "postPosition4",
    "Post Position 5": "postPosition5",
    "Post Position 6": "postPosition6",
    "Angle 1": "angle1",
    "Angle 2": "angle2",
    "Angle 3": "angle3",
    "Angle 4": "angle4",
    "Angle 5": "angle5",
    "Angle 6": "angle6",
    "Louver Opening": "louvresOpening",
    "Shutter Color": "shutterColor",
    "Hinge Color": "hingeColor",
    "Notes": "notes",
    "Sliding Option": "slidingOption",
    "Track Option": "trackOption",
    "Track option": "trackOption",
    "Shape Type": "shapeType",
    "ShapeType": "shapeType",
    "DrawingUpload": "drawingUpload"
  }
  const keyLabelMap = Object.entries(labelKeyMap).reduce((acc,[label,key])=>{
    acc[key]=label
    return acc
  },{})
  const numericKeys = new Set([
    "width",
    "height",
    "midRail1",
    "midRail2",
    "split1",
    "split2",
    "tierOnTier1",
    "tierOnTier2",
    "postPosition1",
    "postPosition2",
    "postPosition3",
    "postPosition4",
    "postPosition5",
    "postPosition6",
    "buildUpLeft",
    "buildUpRight",
    "buildUpTop",
    "buildUpBottom",
    "battensWidth",
    "battensDepth",
    "battensHeight"
  ])

  const setFieldByKey = (key,value) => {
    const labelText = keyLabelMap[key]
    if (!labelText) return
    const applyInput = (input) => {
      if (!input) return
      if (input.type==="checkbox") input.checked = String(value).toUpperCase()==="YES"
      else if (input.type==="file") {
        input.dataset.uploadedName = value || ""
        updateDrawingHint()
      }
      else if (numericKeys.has(key)) {
        input.dataset.mmValue = value || ""
        input.value = formatInputValue(value || "")
      } else input.value = value
    }
    const directInputs = window.qsa(`[data-field="${labelText}"]`)
    if (directInputs.length) {
      directInputs.forEach(input => applyInput(input))
      return
    }
    const directRows = window.qsa(`.option-row[data-field="${labelText}"]`)
    if (directRows.length) {
      directRows.forEach(row => {
        const btn = Array.from(row.querySelectorAll(".toggle")).find(b => b.textContent.trim() === String(value))
        if (btn) window.setToggleActive(btn)
      })
      return
    }
    const fields = window.qsa(".form-field").filter(f=>{
      const label=f.querySelector("label")
      return label && label.textContent.trim()===labelText
    })
    fields.forEach(field=>{
      const input = field.querySelector("input,select,textarea")
      if (input) {
        applyInput(input)
        return
      }
      const row = field.querySelector(".option-row")
      if (row){
        const btn = Array.from(row.querySelectorAll(".toggle")).find(b=>b.textContent.trim()===String(value))
        if (btn) window.setToggleActive(btn)
      }
    })
  }

  const collectToggleValues = (sectionId) => {
    const section = window.qs(sectionId)
    if (!section) return {}
    const data = {}
    section.querySelectorAll(".form-field").forEach(field => {
      const label = field.querySelector("label")
      const row = field.querySelector(".option-row")
      if (!row) return
      const fieldLabel = row.dataset.field || (label ? label.textContent.trim() : "")
      if (!fieldLabel) return
      const key = labelKeyMap[fieldLabel]
      if (!key) return
      const active = row.querySelector(".toggle.active")
      if (active) data[key] = active.textContent.trim()
    })
    return data
  }

  const collectSectionValues = (sectionId) => {
    const section = window.qs(sectionId)
    if (!section) return {}
    const data = {}
    section.querySelectorAll(".form-field").forEach(field => {
      const label = field.querySelector("label")
      const inputs = field.querySelectorAll("input,select,textarea")
      if (!label || !inputs.length) return
      inputs.forEach(input => {
        const fieldLabel = input.dataset.field || label.textContent.trim()
        const key = labelKeyMap[fieldLabel]
        if (!key) return
        if (input.type === "checkbox") data[key] = input.checked ? "YES" : "NO"
        else if (input.type === "file") {
          const name = input.dataset.uploadedName || (input.files && input.files[0] ? input.files[0].name : "")
          data[key] = name
          if (key === "drawingUpload") data.drawingUploadFileId = input.dataset.uploadedId || ""
        }
        else if (numericKeys.has(key)) data[key] = getInputMmValue(input)
        else data[key] = input.value
      })
    })
    return data
  }

  const getNumberRule = (label) => {
    if (label.startsWith("Width")) return { min: 200, max: 10000, field: "width" }
    if (label.startsWith("Height")) return { min: 350, max: 3000, field: "height" }
    if (label === "MID RAIL 1" || label === "MID RAIL 2" || label === "TIER ON TIER 1" || label === "TIER ON TIER 2") return { min: 300, max: "height-300" }
    if (label === "SPLIT 1" || label === "SPLIT 2") return { min: 154, max: "height-154" }
    if (label.startsWith("Post Position")) return { min: 200, max: "width-200" }
    if (label.startsWith("Angle")) return { min: 79, max: 179, field: "angle" }
    return null
  }

  const formatRuleValue = (rawValue, rule) => {
    const value = toNumber(rawValue)
    if (!value) return "0"
    if (rule && rule.field === "angle") return formatNumber(value)
    const v = isInch() ? value / 25.4 : value
    return formatNumber(v)
  }
  const validateNumber = (value, min, max, input, rule) => {
    const num = parseFloat(value)
    if (!Number.isFinite(num)) return { ok: false, message: "Enter a valid number." }
    let normalized = num
    if (!(rule && rule.field === "angle")) {
      normalized = isInch() ? num * 25.4 : num
      if (input && input.dataset && input.dataset.mmValue !== undefined && String(input.dataset.mmValue).trim() !== "") {
        normalized = toNumber(input.dataset.mmValue)
      }
    }
    if (!Number.isFinite(normalized)) return { ok: false, message: "Enter a valid number." }
    if (normalized < min || normalized > max) {
      const unitLabel = rule && rule.field === "angle" ? "" : ` ${isInch() ? "in" : "mm"}`
      return { ok: false, message: `Enter ${formatRuleValue(min, rule)}-${formatRuleValue(max, rule)}${unitLabel}.` }
    }
    return { ok: true }
  }

  const setFieldError = (field, message) => {
    if (!field) return
    let error = field.querySelector(".field-error")
    if (!error) {
      error = document.createElement("div")
      error.className = "field-error"
      field.appendChild(error)
    }
    if (message) {
      field.classList.add("invalid")
      error.textContent = message
    } else {
      field.classList.remove("invalid")
      error.textContent = ""
    }
  }

  const shakeField = (input) => {
    if (!input) return
    input.classList.remove("shake")
    void input.offsetWidth
    input.classList.add("shake")
    setTimeout(() => input.classList.remove("shake"), 400)
  }

  const shakeElement = (el) => {
    if (!el) return
    el.classList.remove("shake")
    void el.offsetWidth
    el.classList.add("shake")
    setTimeout(() => el.classList.remove("shake"), 400)
  }

  const setBlockError = (el, message) => {
    if (!el) return
    let error = el.querySelector(".field-error")
    if (!error) {
      error = document.createElement("div")
      error.className = "field-error"
      el.appendChild(error)
    }
    if (message) {
      el.classList.add("invalid")
      error.textContent = message
    } else {
      el.classList.remove("invalid")
      error.textContent = ""
    }
  }

  let cartEditLineId = ""
  const getMountSelect = () => {
    const field = Array.from(window.qsa("#general .form-field")).find(item => {
      const label = item.querySelector("label")
      return label && label.textContent.trim() === "Mount"
    })
    return field ? field.querySelector("select") : null
  }

  const applyCartLine = (line) => {
    if (!line) return
    cartEditLineId = line.id || ""
    const roomInput = window.qs("#general input[type='text']")
    const mountSelect = getMountSelect()
    const sqmInput = window.qs("[data-sqm-input]")
    if (roomInput) roomInput.value = line.room || ""
    if (mountSelect) mountSelect.value = line.mount || ""
    if (sqmInput) sqmInput.textContent = units.formatAreaFromSqm ? units.formatAreaFromSqm(line.sqm, getUnit()) : (line.sqm || "0.00")
    state.style = line.style || ""
    state.product = line.product || "Hollow"
    state.panelConfig = line.panelConfig || ""
    state.width = line.width || ""
    state.height = line.height || ""
    selection.louvresSize = line.louvresSize || ""
    selection.stile = line.stile || ""
    selection.tpost = line.tpost || line.tPost || ""
    selection.frameType = line.frameType || ""
    selectedFrameId = String(frameIdByName.get(selection.frameType) || "")
    selectedFrameDataRaw = String(frameDataByName.get(selection.frameType) || "")
    window.qsa("[data-style]").forEach(btn=>{
      if (btn.dataset.value === state.style) window.setToggleActive(btn)
    })
    window.qsa("[data-product]").forEach(btn=>{
      if (btn.dataset.value === state.product) window.setToggleActive(btn)
    })
    const widthInput = window.qs("[data-width]")
    const heightInput = window.qs("[data-height]")
    const panelInput = window.qs("[data-panel]")
    if (widthInput) {
      widthInput.dataset.mmValue = state.width || ""
      widthInput.value = formatInputValue(state.width)
    }
    if (heightInput) {
      heightInput.dataset.mmValue = state.height || ""
      heightInput.value = formatInputValue(state.height)
    }
    if (panelInput) panelInput.value = state.panelConfig
    const applyColors = () => {
      const shutterSelect = window.qs('[data-color-select="shutter"]')
      const hingeSelect = window.qs('[data-color-select="hinge"]')
      if (shutterSelect && line.shutterColor) {
        shutterSelect.value = line.shutterColor
        if (!shutterSelect.value) shutterSelect.dataset.pendingValue = line.shutterColor
      }
      if (hingeSelect && line.hingeColor) {
        hingeSelect.value = line.hingeColor
        if (!hingeSelect.value) hingeSelect.dataset.pendingValue = line.hingeColor
      }
      const tiltRow = window.qs('[data-segmented="tilt"]')
      if (tiltRow && line.tiltOption) {
        const tiltValue = String(line.tiltOption).trim()
        const btn = Array.from(tiltRow.querySelectorAll(".toggle")).find(b => b.textContent.trim() === tiltValue)
        if (btn) window.setToggleActive(btn)
        else tiltRow.dataset.pendingValue = tiltValue
      }
      const trackRow = window.qs("[data-track-option]")
      const slidingRow = window.qs("[data-sliding-option]")
      if (trackRow && line.trackOption) {
        const btn = Array.from(trackRow.querySelectorAll(".toggle")).find(b=>b.textContent.trim()===String(line.trackOption))
        if (btn) window.setToggleActive(btn)
      }
      if (slidingRow && line.slidingOption) {
        const btn = Array.from(slidingRow.querySelectorAll(".toggle")).find(b=>b.textContent.trim()===String(line.slidingOption))
        if (btn) window.setToggleActive(btn)
      }
      const shapeSelect=window.qs('[data-field="SHAPE TYPE"]')
      if (shapeSelect && line.shapeType) {
        shapeSelect.value=line.shapeType
        if (!shapeSelect.value) shapeSelect.dataset.pendingValue=line.shapeType
      }
      const drawingInput=window.qs('[data-drawing-upload]')
      if (drawingInput) {
        drawingInput.dataset.uploadedName = line.drawingUpload || ""
        drawingInput.dataset.uploadedId = line.drawingUploadFileId || ""
        if (line.drawingUpload || line.drawingUploadFileId) updateDrawingHint()
      }
    }
    Object.keys(keyLabelMap).forEach(key=>{
      if (line[key] !== undefined && line[key] !== "") setFieldByKey(key,line[key])
    })
    const sides = ["left","right","top","bottom"]
    sides.forEach(side=>{
      const input = window.qs(`[data-frame-side="${side}"]`)
      const key = `frameSide${side[0].toUpperCase()+side.slice(1)}`
      if (input) input.checked = String(line[key]||"").toUpperCase()==="YES"
    })
    sides.forEach(side=>{
      const input = window.qs(`[data-cilplate="${side}"]`)
      const key = `cilplates${side[0].toUpperCase()+side.slice(1)}`
      if (input) input.checked = String(line[key]||"").toUpperCase()==="YES"
    })
    sides.forEach(side=>{
      const input = window.qs(`[data-build-up="${side}"]`)
      const key = `buildUp${side[0].toUpperCase()+side.slice(1)}`
      if (input && line[key] !== undefined) {
        input.dataset.mmValue = line[key] || ""
        input.value = formatInputValue(line[key])
      }
    })
    const battenWidth = window.qs('[data-batten="width"]')
    const battenDepth = window.qs('[data-batten="depth"]')
    const battenHeight = window.qs('[data-batten="height"]')
    if (battenWidth && line.battensWidth !== undefined) {
      battenWidth.dataset.mmValue = line.battensWidth || ""
      battenWidth.value = formatInputValue(line.battensWidth)
    }
    if (battenDepth && line.battensDepth !== undefined) {
      battenDepth.dataset.mmValue = line.battensDepth || ""
      battenDepth.value = formatInputValue(line.battensDepth)
    }
    if (battenHeight && line.battensHeight !== undefined) {
      battenHeight.dataset.mmValue = line.battensHeight || ""
      battenHeight.value = formatInputValue(line.battensHeight)
    }
    refreshUnitInputs()
    applyColors()
    updatePostPositions(state.panelConfig)
    updateRules()
    updateSqm()
    updatePreview()
    loadProfiles().then(()=>applyColors())
    loadColors()
    const addBtn = window.qs("[data-add-cart]")
    if (addBtn && !isOrderLineEdit){
      addBtn.dataset.defaultText = "Update Order"
      addBtn.textContent = "Update Order"
    }
  }

  const validateInput = (input) => {
    if (!input) return true
    if (input.classList && (input.classList.contains("inch-int") || input.classList.contains("inch-frac"))) {
      const field = input.closest("[data-inline-field]") || input.closest(".form-field")
      const source = field ? field.querySelector('input[type="number"][data-inch-source="1"]') : null
      if (source) return validateInput(source)
      return true
    }
    const field = input.closest("[data-inline-field]") || input.closest(".form-field")
    if (!field) return true
    const fieldLabel = field.dataset.fieldLabel || ""
    const labelEl = field.querySelector("label") || input.closest(".form-field")?.querySelector("label")
    const label = (input.dataset.field || fieldLabel || (labelEl ? labelEl.textContent.replace(/\s+Allow:.*/,"").trim() : "")).trim()
    const value = input.value.trim()
    if (label === "Room") {
      if (!value) { setFieldError(field, "Required. Enter Room."); shakeField(input); return false }
      setFieldError(field, ""); return true
    }
    if (label === "Panel Configuration") {
      if (!value) { setFieldError(field, "Required. Enter panel configuration."); shakeField(input); return false }
      if (!state.style) { setFieldError(field, "Select Style first."); shakeField(input); return false }
      if (!panelValid()) {
        if (state.style === "Bypass Track") setFieldError(field, "Invalid. Use F/M/B and M cannot be first.")
        else if (supportsExtendedStructuralPosts(state.style)) setFieldError(field, "Invalid. Use L/T/B/C/R and T/B/C must be between L and R.")
        else setFieldError(field, "Invalid. Use L/T/R and T must be between L and R.")
        shakeField(input); return false
      }
      setFieldError(field, ""); return true
    }
    if (label === "Mount") {
      if (!value) { setFieldError(field, "Required. Select Mount."); shakeField(input); return false }
      setFieldError(field, ""); return true
    }
    const numberRule = getNumberRule(label)
    if (numberRule) {
      if (!value) {
        if (label.startsWith("Angle") && input.offsetParent !== null) {
          setFieldError(field, "Required. Enter Angle.")
          shakeField(input)
          return false
        }
        if (label.startsWith("Width")) { setFieldError(field, "Required. Enter Width."); shakeField(input); return false }
        if (label.startsWith("Height")) { setFieldError(field, "Required. Enter Height."); shakeField(input); return false }
        setFieldError(field, ""); return true
      }
      let max = numberRule.max
      if (max === "height-300" || max === "height-154") {
        const maxRule = max
        if (!state.height) { setFieldError(field, "Enter Height first."); shakeField(input); return false }
        max = (parseFloat(state.height) || 0) - (maxRule === "height-300" ? 300 : 154)
        if (max < numberRule.min) {
          const message = maxRule === "height-300"
            ? "Current Height is too small to set MID/TIER ON TIER. Increase Height first."
            : "Current Height is too small for this field. Increase Height first."
          setFieldError(field, message)
          shakeField(input)
          return false
        }
      }
      if (max === "width-200") {
        if (!state.width) { setFieldError(field, "Enter Width first."); shakeField(input); return false }
        max = (parseFloat(state.width) || 0) - 200
        if (max < numberRule.min) {
          setFieldError(field, "Current Width is too small to set Post Position. Increase Width first.")
          shakeField(input)
          return false
        }
      }
      const result = validateNumber(value, numberRule.min, max, input, numberRule)
      if (!result.ok) { setFieldError(field, result.message); shakeField(input); return false }
      setFieldError(field, ""); return true
    }
    if (input.tagName === "SELECT") {
      if (!value) { setFieldError(field, "Required."); shakeField(input); return false }
      setFieldError(field, ""); return true
    }
    return true
  }

  let defaultsCaptured = false
  const captureDefaults = () => {
    if (defaultsCaptured) return
    defaultsCaptured = true
    window.qsa(".option-row").forEach(row=>{
      const active = row.querySelector(".toggle.active")
      row.dataset.defaultValue = active ? active.textContent.trim() : ""
    })
    window.qsa(".config-main select").forEach(select=>{
      select.dataset.defaultValue = select.value
    })
    window.qsa(".config-main input[type='checkbox']").forEach(input=>{
      input.dataset.defaultChecked = input.checked ? "true" : "false"
    })
  }

  const setOptionRowValue = (row, value) => {
    if (!row) return
    row.querySelectorAll(".toggle").forEach(btn => btn.classList.remove("active"))
    if (!value) return
    const btn = Array.from(row.querySelectorAll(".toggle")).find(b=>b.textContent.trim()===value)
    if (btn) btn.classList.add("active")
  }

  const clearAfterAdd = () => {
    state.style = ""
    state.width = ""
    state.height = ""
    state.panelConfig = ""
    resetSelections()
    clearMidrailVisualActive()
    window.qsa(".config-main input").forEach(input => {
      if (input.type === "checkbox") return
      if (input.type === "file") {
        input.value = ""
        input.dataset.uploadedName = ""
        input.dataset.uploadedId = ""
        return
      }
      if (input.type === "text" || input.type === "number") {
        input.value = ""
        if (input.type === "number") input.dataset.mmValue = ""
      }
    })
    window.qsa(".config-main textarea").forEach(textarea => { textarea.value = "" })
    window.qsa(".config-main select").forEach(select => {
      const defaultValue = select.dataset.defaultValue || ""
      if (defaultValue) select.value = defaultValue
      else if (select.querySelector('option[value=""]')) select.value = ""
    })
    window.qsa(".config-main input[type='checkbox']").forEach(input=>{
      const checked = input.dataset.defaultChecked === "true"
      input.checked = checked
    })
    window.qsa(".option-row").forEach(row=>{
      setOptionRowValue(row, row.dataset.defaultValue || "")
    })
    window.qsa('input[type="number"]:not(.inch-int):not([data-no-unit="1"])').forEach(input => {
      const entry = inchInputMap.get(input)
      if (!entry) return
      entry.intInput.value = ""
      entry.fracSelect.value = "0"
    })
    const productActive = window.qs("[data-product].active")
    state.product = productActive ? productActive.dataset.value || "" : "Hollow"
    const styleActive = window.qs("[data-style].active")
    state.style = styleActive ? styleActive.dataset.value || "" : ""
    window.qsa(".form-field").forEach(field => setFieldError(field, ""))
    updateSqm()
    updatePostPositions("")
    updateRules()
    updatePreview()
    setAddHint("")
    saveDraft()
  }

  const setAddButtonState = (btn, stateLabel) => {
    if (!btn) return
    if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent.trim()
    if (stateLabel === "loading") {
      btn.textContent = btn.dataset.loadingText || "Adding..."
      btn.classList.add("is-loading")
      btn.classList.remove("is-success")
      btn.disabled = true
      return
    }
    if (stateLabel === "success") {
      btn.textContent = btn.dataset.successText || "Added ✓"
      btn.classList.remove("is-loading")
      btn.classList.add("is-success")
      btn.disabled = true
      setTimeout(() => {
        btn.textContent = btn.dataset.defaultText || "Add to Order"
        btn.classList.remove("is-success")
        btn.disabled = false
      }, 1400)
      return
    }
    btn.textContent = btn.dataset.defaultText || "Add to Order"
    btn.classList.remove("is-loading","is-success")
    btn.disabled = false
  }
  const setAddHint = (message) => {
    const addBtn = window.qs("[data-add-cart]")
    if (!addBtn) return
    let hint = window.qs("[data-add-cart-hint]")
    if (!hint) {
      hint = document.createElement("div")
      hint.className = "add-cart-hint"
      hint.dataset.addCartHint = "1"
      addBtn.insertAdjacentElement("afterend", hint)
    }
    hint.textContent = message || ""
    hint.style.display = message ? "" : "none"
  }

  const bounceCartIcon = () => {
    const cart = window.qs(".cart-icon")
    if (!cart) return
    cart.classList.remove("is-bounce")
    void cart.offsetWidth
    cart.classList.add("is-bounce")
  }

  const collectFrameExtras = () => {
    const frame = {}
    const sides = ["left","right","top","bottom"]
    sides.forEach(side=>{
      const input = window.qs(`[data-frame-side="${side}"]`)
      if (input) frame[`frameSide${side[0].toUpperCase()+side.slice(1)}`] = input.checked ? "YES" : "NO"
    })
    sides.forEach(side=>{
      const input = window.qs(`[data-cilplate="${side}"]`)
      if (input) frame[`cilplates${side[0].toUpperCase()+side.slice(1)}`] = input.checked ? "YES" : "NO"
    })
    sides.forEach(side=>{
      const input = window.qs(`[data-build-up="${side}"]`)
      if (input && input.value !== "") frame[`buildUp${side[0].toUpperCase()+side.slice(1)}`] = getInputMmValue(input)
    })
    const battenWidth = window.qs('[data-batten="width"]')
    const battenDepth = window.qs('[data-batten="depth"]')
    const battenHeight = window.qs('[data-batten="height"]')
    if (battenWidth && battenWidth.value !== "") frame.battensWidth = getInputMmValue(battenWidth)
    if (battenDepth && battenDepth.value !== "") frame.battensDepth = getInputMmValue(battenDepth)
    if (battenHeight && battenHeight.value !== "") frame.battensHeight = getInputMmValue(battenHeight)
    return frame
  }
  const getActiveProfileName = (category) => {
    const container = window.qs(`[data-profile-list="${category}"]`)
    if (!container) return ""
    const card = container.querySelector(".component-card.active")
    if (!card) return ""
    return String(card.dataset.name || "").trim()
  }
  const applyRatioPreset = (target, ratios) => {
    const h = toNumber(state.height || "0")
    if (!h) {
      setAddHint("Please enter Height first.")
      return
    }
    const fields = target === "midrail" ? ["MID RAIL 1", "MID RAIL 2"] : ["SPLIT 1", "SPLIT 2"]
    ratios.forEach((ratio, index) => {
      const input = window.qs(`[data-field="${fields[index]}"]`)
      if (!input) return
      const mm = roundMmForCurrentUnit(h * ratio)
      input.dataset.mmValue = mm
      input.value = formatInputValue(mm)
      if (isInch()) syncCompositeInput(input)
      validateInput(input)
    })
    setAddHint("")
    updatePreview()
    saveDraft()
  }
  const setMidrailVisualActive = (field, ratioText) => {
    const ruler = window.qs(`[data-midrail-ruler="${field}"]`)
    if (!ruler) return
    ruler.querySelectorAll(`[data-midrail-field="${field}"]`).forEach(btn => {
      btn.classList.toggle("is-active", String(btn.dataset.midrailRatio || "") === String(ratioText || ""))
    })
  }
  const clearMidrailVisualActive = () => {
    window.qsa("[data-midrail-ruler]").forEach(ruler => {
      ruler.querySelectorAll("[data-midrail-field]").forEach(btn => btn.classList.remove("is-active"))
    })
  }
  const applyMidrailVisualRatio = (field, ratio) => {
    const h = toNumber(state.height || "0")
    if (!h) {
      setAddHint("Please enter Height first.")
      return
    }
    const input = window.qs(`[data-field="${field}"]`)
    if (!input) return
    const mm = roundMmForCurrentUnit(h * ratio)
    input.dataset.mmValue = mm
    input.value = formatInputValue(mm)
    if (isInch()) syncCompositeInput(input)
    validateInput(input)
    setMidrailVisualActive(field, String(ratio))
    setAddHint("")
    updatePreview()
    saveDraft()
  }
  const bindMidrailVisualControls = () => {
    window.qsa("[data-midrail-field][data-midrail-ratio]").forEach(btn => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.midrailField || ""
        const ratio = Number(btn.dataset.midrailRatio || "")
        if (!Number.isFinite(ratio) || ratio <= 0) return
        if (!field) return
        applyMidrailVisualRatio(field, ratio)
      })
    })
    ;["MID RAIL 1","MID RAIL 2","SPLIT 1","SPLIT 2"].forEach(field => {
      const input = window.qs(`[data-field="${field}"]`)
      if (!input) return
      input.addEventListener("input", () => {
        setMidrailVisualActive(field, "")
      })
    })
  }
  const bindRatioPresets = () => {
    window.qsa("[data-ratio-target]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.ratioTarget || ""
        const ratios = String(btn.dataset.ratios || "")
          .split(",")
          .map(v => Number(v))
          .filter(v => Number.isFinite(v) && v > 0)
        if (!target || !ratios.length) return
        applyRatioPreset(target, ratios)
      })
    })
  }

  const getConfiguratorPayload = () => {
    const roomInput = window.qs("#general input[type='text']")
    const mountSelect = getMountSelect()
    const finish = {...collectSectionValues("#finish"),...collectToggleValues("#finish")}
    const track = {...collectSectionValues("#others"),...collectToggleValues("#others")}
    const structure = {...collectSectionValues("#structure"),...collectToggleValues("#structure"),...collectToggleValues("#louvers")}
    if (state.style === "Full Height") structure.horizontalTpost = "NO"
    const profile = {
      louvresSize: selection.louvresSize || getActiveProfileName("Louver"),
      louvresOpening: currentLouverOpeningMode === "None" ? "1way" : (structure.louvresOpening || getAllowedLouverOpenings()[0] || "1way"),
      stile: selection.stile || getActiveProfileName("Stile"),
      tpost: shouldShowTPost() ? (selection.tpost || getActiveProfileName("TPost")) : ""
    }
    const frame = { frameType: selection.frameType, ...collectFrameExtras() }
    return {
      room: roomInput ? roomInput.value : "",
      product: state.product,
      style: state.style,
      width: state.width,
      height: state.height,
      panelConfig: state.panelConfig,
      sqm: getSqmValue(),
      mount: mountSelect ? mountSelect.value : "",
      ...structure,
      ...profile,
      ...frame,
      ...finish,
      ...track
    }
  }

  const buildDraft = () => {
    const roomInput = window.qs("#general input[type='text']")
    const mountSelect = getMountSelect()
    const fields = {
      ...collectSectionValues("#structure"),
      ...collectToggleValues("#structure"),
      ...collectSectionValues("#finish"),
      ...collectToggleValues("#finish"),
      ...collectSectionValues("#others"),
      ...collectToggleValues("#others"),
      ...collectToggleValues("#louvers")
    }
    return {
      state:{...state},
      selection:{...selection},
      room: roomInput ? roomInput.value : "",
      mount: mountSelect ? mountSelect.value : "",
      sqm: getSqmValue(),
      fields
    }
  }

  const saveDraft = () => {
    try{
      localStorage.setItem(draftKey, JSON.stringify(buildDraft()))
    }catch(e){}
  }

  const applyDraft = (draft) => {
    if (!draft) return
    const roomInput = window.qs("#general input[type='text']")
    const mountSelect = getMountSelect()
    const sqmInput = window.qs("[data-sqm-input]")
    if (roomInput) roomInput.value = draft.room || ""
    if (mountSelect) mountSelect.value = draft.mount || ""
    if (sqmInput) sqmInput.textContent = units.formatAreaFromSqm ? units.formatAreaFromSqm(draft.sqm, getUnit()) : (draft.sqm || "0.00")
    state.style = draft.state?.style || ""
    state.product = draft.state?.product || "Hollow"
    state.panelConfig = draft.state?.panelConfig || ""
    state.width = draft.state?.width || ""
    state.height = draft.state?.height || ""
    selection.louvresSize = draft.selection?.louvresSize || ""
    selection.stile = draft.selection?.stile || ""
    selection.tpost = draft.selection?.tpost || ""
    selection.frameType = draft.selection?.frameType || ""
    selectedFrameId = String(frameIdByName.get(selection.frameType) || "")
    selectedFrameDataRaw = String(frameDataByName.get(selection.frameType) || "")
    window.qsa("[data-style]").forEach(btn=>{
      if (btn.dataset.value === state.style) window.setToggleActive(btn)
    })
    window.qsa("[data-product]").forEach(btn=>{
      if (btn.dataset.value === state.product) window.setToggleActive(btn)
    })
    const widthInput = window.qs("[data-width]")
    const heightInput = window.qs("[data-height]")
    const panelInput = window.qs("[data-panel]")
    if (widthInput) {
      widthInput.dataset.mmValue = state.width || ""
      widthInput.value = formatInputValue(state.width)
    }
    if (heightInput) {
      heightInput.dataset.mmValue = state.height || ""
      heightInput.value = formatInputValue(state.height)
    }
    if (panelInput) panelInput.value = state.panelConfig
    Object.entries(draft.fields||{}).forEach(([key,value])=>setFieldByKey(key,value))
    const drawingInput = window.qs('[data-drawing-upload]')
    if (drawingInput) drawingInput.dataset.uploadedId = draft.fields?.drawingUploadFileId || ""
    refreshUnitInputs()
    loadProfiles()
    updateSqm()
    updatePreview()
  }

  const loadDraft = () => {
    try{
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      applyDraft(JSON.parse(raw))
    }catch(e){}
  }

  const updateCartBadge = async () => {
    if (isOrderLineEdit) return
    const res = await fetchWithRetry("/cart")
    if (!res) return
    const data = await res.json()
    const badge = window.qs(".cart-icon .badge")
    if (badge) badge.textContent = String((data.lines || []).length)
  }

  window.qsa("[data-style]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.style = btn.dataset.value || ""
      window.setToggleActive(btn)
      const styleRow = btn.closest(".option-row")
      if (styleRow) setBlockError(styleRow, "")
      updateRules()
      updatePreview()
      saveDraft()
    })
  })
  const drawingInputInit=()=>{
    const { input, browseBtn, clearBtn } = getDrawingElements()
    if(!input)return
    if (browseBtn) browseBtn.onclick = () => input.click()
    input.addEventListener("change",async()=>{
      const file=input.files&&input.files[0]
      if(file)await uploadDrawingFile(file)
    })
    if (clearBtn) clearBtn.disabled = !(input.dataset.uploadedName || input.dataset.uploadedId)
    if (clearBtn) clearBtn.addEventListener("click", () => {
      input.value = ""
      input.dataset.uploadedName = ""
      input.dataset.uploadedId = ""
      updateDrawingHint()
    })
  }
  drawingInputInit()

  const resetSelections = () => {
    selection.louvresSize = ""
    selection.stile = ""
    selection.tpost = ""
    selection.frameType = ""
    selectedFrameId = ""
    selectedFrameDataRaw = ""
    window.qsa("#louvers .component-card, #stile .component-card, #frames .component-card").forEach(card => {
      card.classList.remove("active")
    })
    updateSqm()
  }

  const loadImageUrl = async (imageUrl) => {
    if (!imageUrl) return ""
    if (imageCache.has(imageUrl)) return imageCache.get(imageUrl)
    if (/^https?:\/\//.test(imageUrl)) {
      imageCache.set(imageUrl, imageUrl)
      return imageUrl
    }
    const path = imageUrl.startsWith("/files/") ? imageUrl : `/files/${imageUrl}`
    const res = await window.apiFetch(path)
    if (res && res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      imageCache.set(imageUrl, url)
      return url
    }
    if (imageUrl.startsWith("/files/")) return `${apiBase}${imageUrl}`
    return `${apiBase}/files/${imageUrl}`
  }

  const renderProfileCards = (container, rows, selectionKey) => {
    container.innerHTML = ""
    rows.forEach(row => {
      const card = document.createElement("div")
      card.className = "component-card"
      card.dataset.name = row.name || ""
      const thumb = document.createElement("div")
      thumb.className = "component-thumb"
      thumb.textContent = "🧩"
      if (row.imageUrl) {
        loadImageUrl(row.imageUrl).then(url => {
          if (!url) return
          thumb.textContent = ""
          const img = document.createElement("img")
          img.src = url
          img.alt = row.name || ""
          thumb.appendChild(img)
        })
      }
      const title = document.createElement("div")
      title.className = "component-title"
      title.textContent = row.name || ""
      card.appendChild(thumb)
      card.appendChild(title)
      if (selectionKey && row.name && selection[selectionKey] === row.name) {
        card.classList.add("active")
        if (selectionKey === "frameType") {
          selectedFrameDataRaw = String(row.data || "")
          selectedFrameId = String(row.id || "")
        }
      }
      card.addEventListener("click", () => {
        window.setCardActive(card, `[data-profile-list="${row.category}"] .component-card`)
        if (selectionKey) selection[selectionKey] = row.name || ""
        if (selectionKey === "frameType") {
          selectedFrameDataRaw = String(row.data || "")
          selectedFrameId = String(row.id || "")
        }
        setBlockError(container, "")
        updateSqm()
        saveDraft()
      })
      container.appendChild(card)
    })
  }

  const loadProfiles = async () => {
    const material = state.product || ""
    const mountSelect = getMountSelect()
    const selectedMount = String(mountSelect && mountSelect.value || "").trim().toUpperCase()
    const profileMountMap = companyConfig.profileMountMap && typeof companyConfig.profileMountMap === "object" ? companyConfig.profileMountMap : {}
    const containers = {
      Louver: window.qs('[data-profile-list="Louver"]'),
      Stile: window.qs('[data-profile-list="Stile"]'),
      TPost: window.qs('[data-profile-list="TPost"]'),
      Frame: window.qs('[data-profile-list="Frame"]')
    }
    const categories = ["Louver", "Stile", "TPost", "Frame"]
    const allowedProfiles = new Set((companyConfig.profileIds || []).filter(Boolean))
    const data = await Promise.all(categories.map(async (category) => {
      const res = await fetchWithRetry(`/profiles?material=${encodeURIComponent(material)}&category=${encodeURIComponent(category)}`)
      if (!res || !res.ok) return []
      const rows = await res.json()
      const list = Array.isArray(rows) ? rows : []
      const filteredByCompany = allowedProfiles.size === 0 ? list : list.filter(row => allowedProfiles.has(row.id))
      if (category !== "Frame" || !selectedMount) return filteredByCompany
      return filteredByCompany.filter(row => {
        const mountListRaw = profileMountMap[row.id]
        const mountList = Array.isArray(mountListRaw)
          ? mountListRaw.map(v => String(v || "").trim().toUpperCase()).filter(v => AVAILABLE_MOUNTS.includes(v))
          : []
        if (!mountList.length) return true
        return mountList.includes(selectedMount)
      })
    }))
    categories.forEach((category, index) => {
      const rows = data[index] || []
      const container = containers[category]
      if (!container) return
      const keyMap = { Louver: "louvresSize", Stile: "stile", TPost: "tpost", Frame: "frameType" }
      if (category === "Frame") {
        frameDataByName = new Map(rows.map(row => [row.name || "", row.data || ""]))
        frameIdByName = new Map(rows.map(row => [row.name || "", row.id || ""]))
        selectedFrameDataRaw = String(frameDataByName.get(selection.frameType) || "")
        selectedFrameId = String(frameIdByName.get(selection.frameType) || "")
      }
      renderProfileCards(container, rows, keyMap[category])
    })
    updateSqm()
  }

  const setColorOptions = (select, colors) => {
    if (!select) return
    const current = select.value || ""
    select.innerHTML = ""
    const defaultOption = document.createElement("option")
    defaultOption.value = ""
    defaultOption.textContent = "Select"
    select.appendChild(defaultOption)
    colors.forEach(color => {
      const option = document.createElement("option")
      option.value = color
      option.textContent = color
      if (color === current) option.selected = true
      select.appendChild(option)
    })
  }

  const safeFetch = async (url) => {
    try{
      return await window.apiFetch(url)
    }catch(e){
      return null
    }
  }
  const fetchWithRetry = async (url, attempts = 2, delayMs = 400) => {
    for (let i = 0; i < attempts; i += 1) {
      const res = await safeFetch(url)
      if (res) return res
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs))
    }
    return null
  }

  const DEFAULT_MATERIAL_OPTIONS = [
    { code: "Hollow", label: "LARK™ Lightweight Shutters" },
    { code: "Coated Paulownia", label: "Coated Paulownia" },
    { code: "Basswood", label: "CARVER™ Wood Shutters" },
    { code: "PVC", label: "TENET™ Composite Shutters" },
    { code: "Sunnex Poly", label: "Sunnex Poly" },
    { code: "Sunnex Wood", label: "Sunnex Wood" },
    { code: "Sunnex Hollow", label: "Sunnex Hollow" }
  ]
  const renderProductButtons = (options) => {
    const row = window.qs('[data-segmented="product"]')
    if (!row) return
    const preferred = state.product || row.querySelector("[data-product].active")?.dataset.value || ""
    row.innerHTML = ""
    options.forEach((item, index) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = `toggle${(preferred ? preferred === item.code : index === 0) ? " active" : ""}`
      btn.dataset.product = "1"
      btn.dataset.value = item.code
      btn.textContent = item.label || item.code
      row.appendChild(btn)
    })
    const active = row.querySelector("[data-product].active")
    if (active && active.dataset.value) state.product = active.dataset.value
  }
  const bindProductButtons = () => {
    window.qsa("[data-product]").forEach(btn => {
      if (btn.dataset.productBound === "1") return
      btn.dataset.productBound = "1"
      btn.addEventListener("click", () => {
        const next = btn.dataset.value || ""
        if (state.product !== next) resetSelections()
        state.product = next
        window.setToggleActive(btn)
      loadColors()
        loadProfiles()
        updatePreview()
        saveDraft()
      })
    })
  }
  const initMaterialOptions = async () => {
    let options = window.materialCatalog && typeof window.materialCatalog.getOptionsSync === "function"
      ? window.materialCatalog.getOptionsSync()
      : DEFAULT_MATERIAL_OPTIONS
    if (window.materialCatalog && typeof window.materialCatalog.load === "function") {
      const loaded = await window.materialCatalog.load()
      if (Array.isArray(loaded) && loaded.length) options = loaded
    } else {
      const res = await fetchWithRetry("/materials")
      if (res && res.ok) {
        const rows = await res.json()
        const normalized = (Array.isArray(rows) ? rows : [])
          .map(item => ({ code: String(item && item.code || "").trim(), label: String(item && item.label || "").trim() }))
          .filter(item => item.code)
        if (normalized.length) options = normalized
      }
    }
    renderProductButtons(options)
    bindProductButtons()
    applyCompanyConfig()
  }
  let companyConfig = { productList: [], styleList: [], profileIds: [], profileMountMap: {}, profileAreaMountMap: {} }
  const getDefaultTiltOptions = () => {
    const row = window.qs('[data-segmented="tilt"]')
    if (!row) return []
    return Array.from(row.querySelectorAll(".toggle")).map(btn => btn.textContent.trim()).filter(Boolean)
  }
  const bindTiltRow = () => {
    const row = window.qs('[data-segmented="tilt"]')
    if (!row || row.dataset.tiltBound === "1") return
    row.dataset.tiltBound = "1"
    row.addEventListener("click", e => {
      const btn = e.target && e.target.closest ? e.target.closest(".toggle") : null
      if (!btn || !row.contains(btn)) return
      window.setToggleActive(btn)
      saveDraft()
      updatePreview()
    })
  }
  const renderTiltButtons = (options) => {
    const row = window.qs('[data-segmented="tilt"]')
    if (!row) return
    const pending = row.dataset.pendingValue ? String(row.dataset.pendingValue).trim() : ""
    const preferred = row.querySelector(".toggle.active")?.textContent.trim() || ""
    const preferredValue = pending || preferred
    const hasPreferred = !!(preferredValue && options.includes(preferredValue))
    row.innerHTML = ""
    options.forEach((value, index) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = `toggle${((hasPreferred && preferredValue === value) || (!hasPreferred && index === 0)) ? " active" : ""}`
      btn.dataset.lock = "after-style"
      btn.textContent = value
      row.appendChild(btn)
    })
    const active = row.querySelector(".toggle.active")
    if (pending) {
      if (active && active.textContent.trim() === pending) delete row.dataset.pendingValue
      else if (!options.includes(pending)) delete row.dataset.pendingValue
    }
    row.dataset.defaultValue = active ? active.textContent.trim() : (options[0] || "")
  }
  const normalizeStyleList = (list, available) => {
    const map = new Map([
      ["Cafe", "Café style"],
      ["Café", "Café style"],
      ["Café Style", "Café style"],
      ["Bi Fold Track", "Bi-Fold Track"],
      ["Bifold Track", "Bi-Fold Track"]
    ])
    const normalized = (Array.isArray(list) ? list : []).map(item => {
      const value = String(item || "").trim()
      return map.get(value) || value
    }).filter(Boolean)
    const allowed = normalized.filter(value => available.includes(value))
    return allowed.length ? allowed : available
  }
  const applyCompanyConfig = () => {
    const productButtons = window.qsa("[data-product]")
    const productValues = productButtons.map(btn => btn.dataset.value || "").filter(Boolean)
    const allowedProducts = companyConfig.productList && companyConfig.productList.length ? companyConfig.productList : productValues
    const productSet = new Set(allowedProducts)
    productButtons.forEach(btn => {
      const value = btn.dataset.value || ""
      btn.style.display = productSet.has(value) ? "" : "none"
    })
    if (allowedProducts.length && !productSet.has(state.product)) {
      state.product = allowedProducts[0]
      window.qsa("[data-product]").forEach(btn => {
        if (btn.dataset.value === state.product) window.setToggleActive(btn)
      })
      resetSelections()
      loadProfiles()
      updatePreview()
      saveDraft()
    }
    const styleButtons = window.qsa("[data-style]")
    const styleValues = styleButtons.map(btn => btn.dataset.value || "").filter(Boolean)
    const allowedStyles = companyConfig.styleList && companyConfig.styleList.length
      ? normalizeStyleList(companyConfig.styleList, styleValues)
      : styleValues
    const styleSet = new Set(allowedStyles)
    styleButtons.forEach(btn => {
      const value = btn.dataset.value || ""
      btn.style.display = styleSet.has(value) ? "" : "none"
    })
    if (allowedStyles.length && !styleSet.has(state.style)) {
      state.style = allowedStyles[0]
      window.qsa("[data-style]").forEach(btn => {
        if (btn.dataset.value === state.style) window.setToggleActive(btn)
      })
      updateRules()
      updatePreview()
      saveDraft()
    }
  }
  const loadCompanyConfig = async () => {
    if (!window.getToken || !window.getToken()) return
    const res = await fetchWithRetry("/company/config")
    if (!res || !res.ok) return
    const data = await res.json()
    companyConfig = data || { productList: [], styleList: [], profileIds: [], profileMountMap: {}, profileAreaMountMap: {} }
    applyCompanyConfig()
    loadProfiles()
  }

  let currentCompanyId = ""
  const loadCompanyContext = async () => {
    if (!window.getToken || !window.getToken()) return
    const res = await fetchWithRetry("/company/current")
    if (!res || !res.ok) return
    const company = await res.json()
    currentCompanyId = company && company.id ? company.id : ""
  }

  const loadColors = async () => {
    if (!window.getToken || !window.getToken()) return
    let companyId = currentCompanyId || ""
    if (!companyId) {
      await loadCompanyContext()
      companyId = currentCompanyId || ""
    }
    if (!companyId) return
    const res = await fetchWithRetry(`/colors?companyId=${encodeURIComponent(companyId)}`)
    if (!res || !res.ok) return
    const rows = await res.json()
    const row = Array.isArray(rows) ? rows[0] : rows
    const parseColorGroups = (value) => {
      const raw = String(value || "").trim()
      const isLegacy = !/shutter\s*:/i.test(raw) && !/hinge\s*:/i.test(raw)
      if (isLegacy) {
        const list = raw.split("/").map(v => v.trim()).filter(Boolean)
        return { shutter: list, hinge: list }
      }
      let shutterRaw = ""
      let hingeRaw = ""
      raw.split(/\n|\|/).forEach(part => {
        const items = part.split(":")
        if (items.length < 2) return
        const key = items.shift().trim().toLowerCase()
        const list = items.join(":").trim()
        if (key === "shutter") shutterRaw = list
        if (key === "hinge") hingeRaw = list
      })
      const toList = (list) => String(list || "").split("/").map(v => v.trim()).filter(Boolean)
      return { shutter: toList(shutterRaw), hinge: toList(hingeRaw) }
    }
    const normalizePair = (pair) => {
      const source = pair && typeof pair === "object" ? pair : {}
      const shutter = Array.isArray(source.shutter) ? source.shutter : String(source.shutter || "").split("/").map(v => v.trim()).filter(Boolean)
      const hinge = Array.isArray(source.hinge) ? source.hinge : String(source.hinge || "").split("/").map(v => v.trim()).filter(Boolean)
      const tilt = Array.isArray(source.tilt) ? source.tilt : String(source.tilt || "").split("/").map(v => v.trim()).filter(Boolean)
      const louverOpening = normalizeLouverOpeningMode(source.louverOpening)
      return { shutter, hinge, tilt, louverOpening }
    }
    let map = null
    try{
      map = row && row.colorMapJson ? JSON.parse(row.colorMapJson) : null
    }catch(e){
      map = null
    }
    const legacy = parseColorGroups(row && row.colorList)
    const productCode = state.product || ""
    const normalizedMap = map && typeof map === "object"
      ? {
          default: normalizePair(map.default),
          byProduct: Object.keys(map.byProduct && typeof map.byProduct === "object" ? map.byProduct : {}).reduce((acc, code) => {
            acc[code] = normalizePair(map.byProduct[code])
            return acc
          }, {})
        }
      : { default: normalizePair(legacy), byProduct: {} }
    const productPair = normalizedMap.byProduct[productCode] || normalizedMap.default
    const fallbackTilts = normalizedMap.default.tilt && normalizedMap.default.tilt.length
      ? normalizedMap.default.tilt
      : getDefaultTiltOptions()
    const lists = {
      shutter: productPair.shutter || [],
      hinge: (productPair.hinge && productPair.hinge.length ? productPair.hinge : normalizedMap.default.hinge) || [],
      tilt: (productPair.tilt && productPair.tilt.length ? productPair.tilt : normalizedMap.default.tilt && normalizedMap.default.tilt.length ? normalizedMap.default.tilt : fallbackTilts) || []
    }
    currentLouverOpeningMode = normalizeLouverOpeningMode(productPair.louverOpening || normalizedMap.default.louverOpening || "Both")
    const shutterSelect = window.qs('[data-color-select="shutter"]')
    const hingeSelect = window.qs('[data-color-select="hinge"]')
    setColorOptions(shutterSelect, lists.shutter)
    setColorOptions(hingeSelect, lists.hinge)
    if (lists.tilt.length) {
      renderTiltButtons(lists.tilt)
      bindTiltRow()
    }
    if (shutterSelect && shutterSelect.dataset.pendingValue) {
      shutterSelect.value = shutterSelect.dataset.pendingValue
      delete shutterSelect.dataset.pendingValue
    }
    if (hingeSelect && hingeSelect.dataset.pendingValue) {
      hingeSelect.value = hingeSelect.dataset.pendingValue
      delete hingeSelect.dataset.pendingValue
    }
    applyLouverOpeningRule()
  }

  captureDefaults()
  loadCompanyContext().then(()=>loadColors())
  initMaterialOptions()
  loadCompanyConfig()
  bindProductButtons()

  const widthInput = window.qs("[data-width]")
  if (widthInput) widthInput.addEventListener("input", e => {
    const mmValue = toMmString(e.target.value)
    widthInput.dataset.mmValue = mmValue
    state.width = mmValue
    updateSqm()
    updatePreview()
    saveDraft()
  })
  const heightInput = window.qs("[data-height]")
  if (heightInput) heightInput.addEventListener("input", e => {
    const mmValue = toMmString(e.target.value)
    heightInput.dataset.mmValue = mmValue
    state.height = mmValue
    updateSqm()
    updatePreview()
    saveDraft()
  })
  const panelInput = window.qs("[data-panel]")
  if (panelInput) panelInput.addEventListener("input", e => { state.panelConfig = e.target.value; updatePostPositions(e.target.value); updateRules(); updatePreview(); saveDraft() })
  const roomInput = window.qs("#general input[type='text']")
  if (roomInput) roomInput.addEventListener("input", () => { updatePreview(); saveDraft() })
  bindMidrailVisualControls()
  bindRatioPresets()
  window.qsa('[data-frame-side]').forEach(input=>{
    input.addEventListener("change",()=>{
      updateSqm()
      saveDraft()
    })
  })
  window.qsa('input[type="number"]:not(.inch-int):not([data-no-unit="1"])').forEach(input => {
    syncInputMmValue(input)
    if (!input.dataset.mmBound) {
      input.dataset.mmBound = "1"
      input.addEventListener("input", () => {
        syncInputMmValue(input)
        updatePreview()
        saveDraft()
      })
    }
  })
  updateUnitLabels()
  applyUnitMode()
  document.addEventListener("unit-change", () => {
    updateUnitLabels()
    refreshUnitInputs()
    applyUnitMode()
    updatePostPositions(state.panelConfig)
    updateSqm()
    updatePreview()
  })

  loadProfiles()

  const anchorLinks = window.qsa(".config-sidebar a[href^='#']")
  if (anchorLinks.length) {
    const scrollContainer = window.qs("[data-config-scroll]") || window
    const isWindowScroll = scrollContainer === window
    const getTopOffset = () => {
      if (!isWindowScroll) return 0
      const topbar = window.qs(".topbar")
      return topbar ? topbar.offsetHeight : 0
    }
    const getScrollTop = () => (isWindowScroll ? window.scrollY : scrollContainer.scrollTop)
    const getContainerTop = () => (isWindowScroll ? 0 : scrollContainer.getBoundingClientRect().top)
    const scrollToTop = (top) => {
      if (isWindowScroll) window.scrollTo({ top, behavior: "smooth" })
      else scrollContainer.scrollTo({ top, behavior: "smooth" })
    }
    const sectionMap = anchorLinks
      .map(link => {
        const target = document.querySelector(link.getAttribute("href"))
        if (!target) return null
        const header = target.querySelector("h4") || target
        return { link, target, header }
      })
      .filter(Boolean)
    const isVisible = (el) => !!(el && el.offsetParent !== null)
    const setActive = (link) => {
      anchorLinks.forEach(l => l.classList.remove("active"))
      if (link) link.classList.add("active")
    }
    let lockActive = false
    const updateActiveByScroll = () => {
      if (lockActive) return
      const topOffset = getTopOffset()
      const current = getScrollTop() + topOffset + 12
      const visibleSections = sectionMap.filter(item => isVisible(item.target))
      if (!visibleSections.length) return
      let active = visibleSections[0]
      let bestDelta = Math.abs((active.header.getBoundingClientRect().top - getContainerTop() + getScrollTop()) - current)
      visibleSections.forEach(item => {
        const top = item.header.getBoundingClientRect().top - getContainerTop() + getScrollTop()
        const delta = Math.abs(top - current)
        if (delta < bestDelta) {
          bestDelta = delta
          active = item
        }
      })
      setActive(active.link)
    }
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        updateActiveByScroll()
        ticking = false
      })
    }
    anchorLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        const target = document.querySelector(link.getAttribute("href"))
        if (!target || !isVisible(target)) return
        e.preventDefault()
        const header = target.querySelector("h4") || target
        const topOffset = getTopOffset()
        const top = header.getBoundingClientRect().top - getContainerTop() + getScrollTop() - topOffset - 12
        lockActive = true
        setActive(link)
        scrollToTop(top)
        clearTimeout(window.__anchorUnlockTimer)
        window.__anchorUnlockTimer = setTimeout(() => {
          lockActive = false
          updateActiveByScroll()
        }, 600)
      })
    })
    scrollContainer.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    updateActiveByScroll()
  }

  window.qsa(".option-row .toggle").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const row = btn.closest(".option-row")
      const fieldName = row ? String(row.dataset.field || "").trim() : ""
      if (fieldName === "Louver Opening") {
        const nextValue = String(btn.textContent || "").trim()
        const allowed = getAllowedLouverOpenings()
        if (!allowed.includes(nextValue)) {
          const message = getLouverOpeningWarningText()
          if (message) setAddHint(message)
          shakeElement(row || btn)
          return
        }
        setAddHint("")
      }
      window.setToggleActive(btn)
      saveDraft()
    })
  })
  window.qsa("select, input, textarea").forEach(input=>{
    if (input.classList && (input.classList.contains("inch-int") || input.classList.contains("inch-frac"))) return
    input.addEventListener("change",()=>{
      setAddHint("")
      saveDraft()
      updatePreview()
      if (input === getMountSelect()) loadProfiles()
    })
    input.addEventListener("blur",()=>validateInput(input))
    if (input.matches('[data-frame-side]')) {
      input.addEventListener("change",()=>updateRules())
    }
  })

  const validateRequiredAll = () => {
    const failedFields = []
    const pushFailed = (name) => {
      const label = String(name || "").trim()
      if (!label) return
      if (!failedFields.includes(label)) failedFields.push(label)
    }
    const getInputLabel = (input) => {
      if (!input) return ""
      if (input.matches("[data-width]")) return "Width"
      if (input.matches("[data-height]")) return "Height"
      if (input.matches("[data-panel]")) return "Panel Configuration"
      if (input.matches('[data-color-select="shutter"]')) return "Shutter Color"
      if (input.matches('[data-color-select="hinge"]')) return "Hinge Color"
      const field = input.closest(".form-field")
      if (!field) return input.name || input.id || "Field"
      const label = field.querySelector("label")
      if (!label) return input.name || input.id || "Field"
      return label.textContent.replace(/\s+Allow:.*/,"").trim()
    }
    const requiredInputs = [
      window.qs("[data-width]"),
      window.qs("[data-height]"),
      window.qs("[data-panel]"),
      window.qs("#general input[type='text']"),
      getMountSelect(),
      window.qs('[data-color-select="shutter"]'),
      window.qs('[data-color-select="hinge"]'),
      window.qs("[data-shape-section] select"),
      ...window.qsa("[data-angle-position]")
    ].filter(el=>{
      if (!el || el.disabled) return false
      if (el.offsetParent !== null) return true
      return !!(isInch() && el.dataset && el.dataset.inchSource === "1")
    })
    let okInputs = true
    requiredInputs.forEach(input => {
      const ok = validateInput(input)
      if (!ok) {
        okInputs = false
        pushFailed(getInputLabel(input))
      }
    })
    const styleBtn = window.qs("[data-style]")
    const styleRow = styleBtn ? styleBtn.closest(".option-row") : null
    const styleActive = window.qs("[data-style].active")
    let okStyle = true
    if (!styleActive) {
      setBlockError(styleRow, "Required. Select Style.")
      shakeElement(styleRow)
      okStyle = false
      pushFailed("Style")
    } else setBlockError(styleRow, "")
    const profileGroups = [
      {key:"Louver",label:"Louver"},
      {key:"Stile",label:"Stile"},
      {key:"Frame",label:"Frame"}
    ]
    if (shouldShowTPost()) profileGroups.splice(2,0,{key:"TPost",label:"TPost"})
    let okProfiles = true
    profileGroups.forEach(group=>{
      const container = window.qs(`[data-profile-list="${group.key}"]`)
      if (!container || container.offsetParent===null) return
      const active = container.querySelector(".component-card.active")
      if (!active) {
        setBlockError(container, `Required. Select ${group.label}.`)
        shakeElement(container)
        okProfiles = false
        pushFailed(group.label)
      } else setBlockError(container, "")
    })
    return { ok: okInputs && okStyle && okProfiles, failedFields }
  }

  const addBtn = window.qs("[data-add-cart]")
  if (addBtn) {
    if (!addBtn.dataset.defaultText) {
      const label = addBtn.dataset.addCartLabel || addBtn.textContent.trim()
      addBtn.dataset.defaultText = label
      addBtn.textContent = label
    }
    if (addBtn.dataset.addCartLoading) addBtn.dataset.loadingText = addBtn.dataset.addCartLoading
    if (addBtn.dataset.addCartSuccess) addBtn.dataset.successText = addBtn.dataset.addCartSuccess
    addBtn.addEventListener("click", async () => {
      const validation = validateRequiredAll()
      if (!validation.ok) {
        const names = validation.failedFields.length ? validation.failedFields.join(", ") : "required fields"
        setAddHint(`Please check: ${names}.`)
        return
      }
      setAddHint("")
      setAddButtonState(addBtn,"loading")
      const payload = getConfiguratorPayload()
      if (isOrderLineEdit) {
        const metaRaw = localStorage.getItem("order_edit_line")
        let success = false
        try{
          const meta = metaRaw ? JSON.parse(metaRaw) : null
          if (!meta || !meta.orderId) return
          const orderRes = await window.apiFetch(`/orders/${meta.orderId}`)
          if (!orderRes || !orderRes.ok) return
          const order = await orderRes.json()
          const lines = Array.isArray(order.lines) ? order.lines : []
          let updated = false
          let nextLines = lines.map((line, idx) => {
            if ((meta.lineId && line.id === meta.lineId) || (meta.lineIndex !== undefined && meta.lineIndex === idx)) {
              updated = true
              return payload
            }
            return line
          })
          if (meta.mode === "add") {
            nextLines = lines.concat(payload)
            updated = true
          }
          if (!updated) return
          const saveRes = await window.apiFetch(`/orders/${meta.orderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderReference: order.orderReference || "", lines: nextLines })
          })
          if (saveRes && saveRes.ok) {
            success = true
            setAddButtonState(addBtn,"success")
            localStorage.removeItem("order_edit_line")
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: "order-line-updated" }, "*")
            }
          }
        }catch(e){
        }finally{
          if (!success) setAddButtonState(addBtn,"default")
        }
        return
      }
      const url = cartEditLineId ? `/cart/lines/${cartEditLineId}` : "/cart/lines"
      const method = cartEditLineId ? "PUT" : "POST"
      const res = await window.apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res && res.ok) {
        await updateCartBadge()
        bounceCartIcon()
        setAddButtonState(addBtn,"success")
        cartEditLineId = ""
        addBtn.dataset.defaultText = "Add to Order"
        clearAfterAdd()
      } else {
        setAddButtonState(addBtn,"default")
      }
    })
  }

  const clearBtn = window.qs("[data-clear-sheet]")
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!isOrderLineEdit) {
        cartEditLineId = ""
        const addBtn = window.qs("[data-add-cart]")
        if (addBtn) {
          addBtn.dataset.defaultText = "Add to Order"
          setAddButtonState(addBtn, "default")
        }
      }
      clearAfterAdd()
    })
  }

  loadDraft()
  if (isOrderLineEdit) {
    try{
      const metaRaw = localStorage.getItem("order_edit_line")
      if (metaRaw) {
        const meta = JSON.parse(metaRaw)
        if (meta && meta.orderId) {
          if (meta.mode === "add") {
            localStorage.removeItem(draftKey)
            clearAfterAdd()
          } else {
            window.apiFetch(`/orders/${meta.orderId}`).then(res => res && res.ok ? res.json() : null).then(order => {
              if (!order) return
              const lines = Array.isArray(order.lines) ? order.lines : []
              const line = meta.lineId ? lines.find(l => l.id === meta.lineId) : lines[meta.lineIndex || 0]
              if (line) applyCartLine(line)
            })
          }
        }
      }
    }catch(e){}
  } else {
    try{
      const raw=localStorage.getItem("cart_edit_line")
      if(raw){
        const line=JSON.parse(raw)
        localStorage.removeItem("cart_edit_line")
        applyCartLine(line)
      }
    }catch(e){}
  }
  updateRules()
  updateSqm()
  updatePreview()
  updatePostPositions(state.panelConfig)
  updateCartBadge()
  loadColors()
}
