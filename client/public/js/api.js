window.qs = (sel) => document.querySelector(sel)
window.qsa = (sel) => Array.from(document.querySelectorAll(sel))
window.setDisabled = (selector, disabled) => {
  window.qsa(selector).forEach(el => {
    el.disabled = disabled
    if (disabled) el.classList.add("is-disabled")
    else el.classList.remove("is-disabled")
  })
}
window.setToggleActive = (btn) => {
  const group = btn.closest(".option-row")
  if (!group) return
  group.querySelectorAll(".toggle").forEach(b => b.classList.remove("active"))
  btn.classList.add("active")
}
window.setCardActive = (card, groupSelector) => {
  window.qsa(groupSelector).forEach(c => c.classList.remove("active"))
  card.classList.add("active")
}

window.ensureFavicon = () => {
  const href = "/images/favicon.png"
  let icon = document.querySelector("link[rel='icon']")
  if (!icon) {
    icon = document.createElement("link")
    icon.setAttribute("rel", "icon")
    document.head.appendChild(icon)
  }
  icon.setAttribute("type", "image/png")
  icon.setAttribute("href", href)
  let apple = document.querySelector("link[rel='apple-touch-icon']")
  if (!apple) {
    apple = document.createElement("link")
    apple.setAttribute("rel", "apple-touch-icon")
    document.head.appendChild(apple)
  }
  apple.setAttribute("href", href)
}
window.ensureFavicon()

window.getToken = () => localStorage.getItem("token") || ""
window.setToken = (t) => localStorage.setItem("token", t)
window.clearToken = () => localStorage.removeItem("token")

window.apiFetch = async (url, options = {}) => {
  const metaBase=document.querySelector("meta[name='api-base']")
  const baseFromMeta=metaBase&&metaBase.content?metaBase.content:""
  const baseFromWindow=window.API_BASE||""
  const base=baseFromMeta||baseFromWindow||""
  const finalBase=base?base:(location.port&&location.port!=="3000"?"http://localhost:3000":"")
  const token = window.getToken()
  const headers = options.headers || {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${finalBase}${url}`, { ...options, headers })
  const skipAuthRedirect = !!options.skipAuthRedirect
  if (res.status === 401 && !skipAuthRedirect) { window.clearToken(); location.href = "/login.html"; return null }
  return res
}

window.materialCatalog = (() => {
  const DEFAULT_OPTIONS = [
    { code: "Hollow", label: "LARK™ Lightweight Shutters" },
    { code: "Coated Paulownia", label: "Coated Paulownia" },
    { code: "Basswood", label: "CARVER™ Wood Shutters" },
    { code: "PVC", label: "TENET™ Composite Shutters" },
    { code: "Sunnex Poly", label: "Sunnex Poly" },
    { code: "Sunnex Wood", label: "Sunnex Wood" },
    { code: "Sunnex Hollow", label: "Sunnex Hollow" }
  ]
  let cache = DEFAULT_OPTIONS.map(item => ({ ...item }))
  let hydrated = false
  let inflight = null
  const normalize = (rows) => (Array.isArray(rows) ? rows : [])
    .map(item => ({ code: String(item && item.code || "").trim(), label: String(item && item.label || "").trim() }))
    .filter(item => item.code)
  const setOptions = (rows) => {
    const normalized = normalize(rows)
    if (normalized.length) {
      cache = normalized
      hydrated = true
    }
    return cache.map(item => ({ ...item }))
  }
  const getOptionsSync = () => cache.map(item => ({ ...item }))
  const findByCode = (code) => {
    const target = String(code || "").trim()
    return cache.find(item => item.code === target) || null
  }
  const getLabelSync = (code) => {
    const target = String(code || "").trim()
    if (!target) return ""
    const match = findByCode(target)
    return match ? (match.label || match.code) : target
  }
  const load = async (force = false) => {
    if (!force && inflight) return inflight
    if (!force && hydrated) return getOptionsSync()
    inflight = (async () => {
      try {
        const res = await window.apiFetch("/materials", { cache: "no-store" })
        if (res && res.ok) {
          const rows = await res.json()
          return setOptions(rows)
        }
      } catch (e) {
      } finally {
        inflight = null
      }
      return getOptionsSync()
    })()
    return inflight
  }
  return { load, setOptions, getOptionsSync, getLabelSync, findByCode }
})()
//window.API_BASE = "http://47.100.175.158:3000"
