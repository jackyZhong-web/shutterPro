# B/C Panel + Angle 校验清单

## 目标范围

- 仅在以下 `Style` 中支持 `B/C`：
  - `Full Height`
  - `Tier on Tier`
  - `Café style`
- 其他 `Style` 的 `Panel Configuration` 规则保持不变
- `Bypass Track` 继续保持原有 `F/M/B` 规则，其中 `B` 仍表示 `Behind`

## Panel Configuration 规则

- `Bypass Track`
  - 仅允许 `F/M/B`
  - 首字符不能为 `M`
- `Full Height / Tier on Tier / Café style`
  - 允许 `L/R/T/B/C`
  - `T/B/C` 都按结构柱处理
  - `T/B/C` 都必须位于 `L` 或 `R` 之间
- 其他非 `Bypass Track` 样式
  - 继续仅允许 `L/T/R`
  - `T` 必须位于 `L` 或 `R` 之间

## 结构柱规则

- `T/B/C` 在以下 3 个样式中都视为结构柱：
  - `Full Height`
  - `Tier on Tier`
  - `Café style`
- 结构柱数量决定：
  - `Post Position 1..6` 的显示数量
  - 预览中的分段数量
- `B/C` 不触发 `TPost` 选择区显示
- 仅 `T` 触发 `TPost` 选择区显示与必填校验

## Angle 规则

- 新增 `Angle 1..6`
- 设计按“柱位序号”对应：
  - 第 `N` 个结构柱 -> `Post Position N`
  - 若第 `N` 个结构柱是 `B` -> 还需要 `Angle N`
- `Angle` 不参与单位换算
- `Angle` 前端只有一套普通数字输入控件
- `Angle N` 在前端需与对应的 `Post Position N` 上下对齐显示
- `Angle` 后端只存一个字符串值
- `Angle` 取值范围：`79~179`
- `Angle` 默认值：`135`
- 只有对应柱位为 `B` 时：
  - 对应 `Angle N` 可见
  - 对应 `Angle N` 必填
- 对应柱位不是 `B` 时：
  - 对应 `Angle N` 隐藏
  - 对应 `Angle N` 自动清空
- 当 `panelConfig` 不再包含对应的 `B` 时：
  - 已隐藏的 `Angle N` 必须自动清空

## 前端页面影响范围

- `Configurator`
  - `Panel Configuration`
  - `Post Position`
  - `Angle`
  - 预览
  - 草稿保存/回填
- `Order Line Edit`
  - 与 `Configurator` 复用同一套表单逻辑
- 订单详情相关页面（共用 `orders-common.js`）
  - 用户订单详情
  - 历史订单详情
  - 管理员订单详情
  - 管理员订单列表展开详情
- `Remakes`
  - 不单独展示结构字段
  - 但其关联订单详情链路应兼容新增字段
- Excel 导出配置
  - 结构字段列表需增加 `angle1..6`

## 后端与数据库影响范围

- `cart_lines`
  - 新增 `angle1..6`
- `order_lines`
  - 新增 `angle1..6`
- 数据库初始化补列脚本需自动补齐上述 12 个字段
- 历史数据无需迁移
- 旧数据中的 `angle1..6` 为空即可

## 回归要求

- `Bypass Track` 的 `F/M/B` 规则不能被破坏
- 非目标样式不能意外支持 `B/C`
- `TPost` 显示/必填逻辑仍只认 `T`
- 预览中：
  - `T/B/C` 在目标样式中都按结构柱处理
  - `Bypass Track` 中的 `B` 仍按原 panel 规则处理
- 订单保存、编辑、回显、导出都能带上 `angle1..6`
- 空 angle 不应在订单详情中显示
