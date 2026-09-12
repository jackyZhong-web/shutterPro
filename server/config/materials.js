const MATERIAL_OPTIONS = [
  { code: "Hollow", label: "LARK™ Lightweight Shutters" },
  { code: "Coated Paulownia", label: "Coated Paulownia" },
  { code: "Basswood", label: "CARVER™ Wood Shutters" },
  { code: "PVC", label: "TENET™ Composite Shutters" },
  { code: "Sunnex Poly", label: "Sunnex Poly" },
  { code: "Sunnex Wood", label: "Sunnex Wood" },
  { code: "Sunnex Hollow", label: "Sunnex Hollow" }
]

const MATERIAL_CODES = MATERIAL_OPTIONS.map(item => item.code)
const MATERIAL_LABEL_BY_CODE = MATERIAL_OPTIONS.reduce((acc, item) => {
  acc[item.code] = item.label || item.code
  return acc
}, {})
const getMaterialLabel = (code) => MATERIAL_LABEL_BY_CODE[code] || code || ""

module.exports = { MATERIAL_OPTIONS, MATERIAL_CODES, MATERIAL_LABEL_BY_CODE, getMaterialLabel }
