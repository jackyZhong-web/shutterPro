const test = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")

const rules = require(path.resolve(__dirname, "..", "..", "client", "public", "js", "panel-config-rules.js"))

test("Full Height / Tier on Tier / Café style 支持 B/C 作为结构柱", () => {
  assert.equal(rules.validatePanelConfig("LBR", "Full Height").ok, true)
  assert.equal(rules.validatePanelConfig("LCR", "Tier on Tier").ok, true)
  assert.equal(rules.validatePanelConfig("LBRCR", "Café style").ok, true)
})

test("非目标样式不支持 B/C 结构柱", () => {
  assert.equal(rules.validatePanelConfig("LBR", "Shape").ok, false)
  assert.equal(rules.validatePanelConfig("LCR", "Bi-Fold Track").ok, false)
})

test("Bypass Track 保持原有 F/M/B 规则", () => {
  assert.equal(rules.validatePanelConfig("FMB", "Bypass Track").ok, true)
  assert.equal(rules.validatePanelConfig("MFB", "Bypass Track").ok, false)
  assert.equal(rules.validatePanelConfig("LBR", "Bypass Track").ok, false)
})

test("结构柱序号与 B 柱位序号按柱位顺序计算", () => {
  const posts = rules.getStructuralPosts("LTRBR", "Full Height")
  assert.deepEqual(posts, [
    { token: "T", index: 1, sequence: 1 },
    { token: "B", index: 3, sequence: 2 }
  ])
  assert.deepEqual(rules.getBPostSequences("LTRBR", "Full Height"), [2])
})

test("只有 T 之外的 B/C 不会被误认为普通 panel 字母", () => {
  assert.deepEqual(rules.getPanelLetters("LBR", "Full Height"), ["L", "R"])
  assert.deepEqual(rules.getPanelLetters("LCR", "Full Height"), ["L", "R"])
  assert.deepEqual(rules.getPanelLetters("FMB", "Bypass Track"), ["F", "M", "B"])
})
