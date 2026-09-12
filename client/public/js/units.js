(() => {
  const UNIT_KEY = "unit_preference"
  const body = document.body
  const page = body ? body.getAttribute("data-page") || "" : ""
  const isAdmin = !!(body && (body.classList.contains("admin-layout") || page.startsWith("admin-")))
  const allowAdminToggle = !!(body && body.hasAttribute("data-allow-unit-toggle"))
  let current = isAdmin && !allowAdminToggle ? "mm" : (localStorage.getItem(UNIT_KEY) || (isAdmin ? "mm" : "inch"))

  const toNumber = (v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  const formatNumber = (num, digits = 2) => {
    if (!Number.isFinite(num)) return ""
    const fixed = num.toFixed(digits)
    return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")
  }
  const mmToIn = (mm) => toNumber(mm) / 25.4
  const inToMm = (inch) => toNumber(inch) * 25.4
  const unitLabel = (unit = current) => (unit === "inch" ? "in" : "mm")
  const areaLabel = (unit = current) => (unit === "inch" ? "ft²" : "㎡")
  const formatLength = (mm, unit = current) => {
    const n = toNumber(mm)
    if (!n) return ""
    return unit === "inch" ? formatNumber(mmToIn(n)) : formatNumber(n)
  }
  const formatAreaFromMm = (widthMm, heightMm, unit = current) => {
    const w = toNumber(widthMm)
    const h = toNumber(heightMm)
    if (!w || !h) return "0.00"
    if (unit === "inch") {
      return formatNumber((w * h) / 92903.04)
    }
    return formatNumber((w * h) / 1000000)
  }
  const formatAreaFromSqm = (sqm, unit = current) => {
    const v = toNumber(sqm)
    if (!v) return "0.00"
    if (unit === "inch") {
      return formatNumber(v * 10.7639)
    }
    return formatNumber(v)
  }
  const updateToggles = () => {
    document.querySelectorAll("[data-unit-toggle]").forEach(toggle => {
      if (toggle.closest('[data-page="cart"]')) return
      toggle.querySelectorAll("button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.unit === current)
      })
    })
  }
  const applyBodyUnitClass = () => {
    if (!body) return
    body.classList.toggle("unit-inch", current === "inch")
  }
  const setUnit = (unit) => {
    if (isAdmin && !allowAdminToggle) return
    if (unit !== "mm" && unit !== "inch") return
    current = unit
    localStorage.setItem(UNIT_KEY, unit)
    updateToggles()
    applyBodyUnitClass()
    document.dispatchEvent(new CustomEvent("unit-change", { detail: { unit } }))
  }
  const getUnit = () => current

  document.addEventListener("DOMContentLoaded", () => {
    updateToggles()
    applyBodyUnitClass()
    document.querySelectorAll("[data-unit-toggle] button").forEach(btn => {
      if (btn.closest('[data-page="cart"]')) return
      btn.addEventListener("click", () => setUnit(btn.dataset.unit))
    })
  })
  window.addEventListener("storage", (e) => {
    if (!e || e.key !== UNIT_KEY) return
    const next = e.newValue
    if (next !== "mm" && next !== "inch") return
    current = next
    updateToggles()
    applyBodyUnitClass()
    document.dispatchEvent(new CustomEvent("unit-change", { detail: { unit: current } }))
  })

  window.units = {
    getUnit,
    setUnit,
    isAdmin,
    mmToIn,
    inToMm,
    unitLabel,
    areaLabel,
    formatLength,
    formatAreaFromMm,
    formatAreaFromSqm
  }
})()
