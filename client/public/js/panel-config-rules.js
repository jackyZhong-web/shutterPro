(function(global, factory) {
  const api = factory()
  if (typeof module !== "undefined" && module.exports) module.exports = api
  global.panelConfigRules = api
})(typeof window !== "undefined" ? window : globalThis, function() {
  const EXTENDED_STRUCTURAL_STYLES = new Set(["Full Height", "Tier on Tier", "Café style"])
  const BYPASS_STYLE = "Bypass Track"

  const normalizeStyle = (style) => String(style || "").trim()
  const normalizePanelConfig = (value) => String(value || "").trim().toUpperCase()
  const isBypassTrackStyle = (style) => normalizeStyle(style) === BYPASS_STYLE
  const supportsExtendedStructuralPosts = (style) => EXTENDED_STRUCTURAL_STYLES.has(normalizeStyle(style))

  const getAllowedTokens = (style) => {
    if (isBypassTrackStyle(style)) return new Set(["F", "M", "B"])
    if (supportsExtendedStructuralPosts(style)) return new Set(["L", "R", "T", "B", "C"])
    return new Set(["L", "R", "T"])
  }

  const tokenizePanelConfig = (value, style) => {
    const allowed = getAllowedTokens(style)
    return normalizePanelConfig(value).split("").filter(token => allowed.has(token))
  }

  const isStructuralPostToken = (token, style) => {
    const value = String(token || "").trim().toUpperCase()
    if (!value || isBypassTrackStyle(style)) return false
    if (value === "T") return true
    return supportsExtendedStructuralPosts(style) && (value === "B" || value === "C")
  }

  const getStructuralPosts = (value, style) => {
    const tokens = tokenizePanelConfig(value, style)
    const posts = []
    tokens.forEach((token, index) => {
      if (!isStructuralPostToken(token, style)) return
      posts.push({ token, index, sequence: posts.length + 1 })
    })
    return posts
  }

  const getBPostSequences = (value, style) => getStructuralPosts(value, style)
    .filter(item => item.token === "B")
    .map(item => item.sequence)

  const getPanelLetters = (value, style) => tokenizePanelConfig(value, style)
    .filter(token => !isStructuralPostToken(token, style))

  const validatePanelConfig = (value, style) => {
    const panel = normalizePanelConfig(value)
    if (!panel) return { ok: false, reason: "empty" }
    if (isBypassTrackStyle(style)) {
      if (!/^[FMB]+$/.test(panel)) return { ok: false, reason: "invalid_bypass_tokens" }
      if (panel[0] === "M") return { ok: false, reason: "invalid_bypass_order" }
      return { ok: true }
    }
    const tokenPattern = supportsExtendedStructuralPosts(style) ? /^[LRTBC]+$/ : /^[LTR]+$/
    if (!tokenPattern.test(panel)) return { ok: false, reason: "invalid_structural_tokens" }
    for (let i = 0; i < panel.length; i += 1) {
      if (!isStructuralPostToken(panel[i], style)) continue
      const left = panel[i - 1] || ""
      const right = panel[i + 1] || ""
      if (!/[LR]/.test(left) || !/[LR]/.test(right)) {
        return { ok: false, reason: "invalid_post_neighbors" }
      }
    }
    return { ok: true }
  }

  return {
    normalizePanelConfig,
    isBypassTrackStyle,
    supportsExtendedStructuralPosts,
    tokenizePanelConfig,
    isStructuralPostToken,
    getStructuralPosts,
    getBPostSequences,
    getPanelLetters,
    validatePanelConfig
  }
})
