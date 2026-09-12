# B/C Panel + Angle 开发计划

## 1. 规则抽离

- 新增一个可测试的纯规则模块
- 统一处理：
  - 哪些样式允许 `B/C`
  - 哪些字符属于结构柱
  - `Bypass Track` 的例外规则
  - `panelConfig` 校验
  - 结构柱序号与 `B` 柱位序号计算

## 2. 前端表单实现

- 在 `Configurator` 的 `Post Position` 下方新增 `Angle 1..6`
- `Angle` 默认隐藏
- 仅对应柱位为 `B` 时显示对应 `Angle`
- 显示时默认填充 `135`
- 隐藏时自动清空
- `Angle` 不参与英制/公制换算
- `Order Line Edit` 自动复用该逻辑

## 3. 前端业务规则接入

- `Panel Configuration` 校验接入新规则模块
- 预览分段接入新规则模块
- `Post Position` 显示数量改为按结构柱数量控制
- `TPost` 区块仍只认 `T`
- 错误提示文案按样式分支更新

## 4. 持久化与回显

- 前端 payload 收集增加 `angle1..6`
- 草稿保存/回填支持 `angle1..6`
- 后端 `lineSchema` 增加 `angle1..6`
- `cart_lines` / `order_lines` 模型增加 `angle1..6`
- `cartService` / `ordersService` 的 `pickLine()` 增加 `angle1..6`
- 数据库初始化补列脚本增加 `angle1..6`

## 5. 订单详情与导出

- 共用订单详情渲染增加 `Angle 1..6`
- 空值不显示
- Excel 导出配置的结构字段列表增加 `angle1..6`
- Excel 字段显示名称补充 `Angle 1..6`

## 6. 测试

- 新增纯规则测试：
  - 目标样式中 `B/C` 合法
  - 非目标样式中 `B/C` 非法
  - `Bypass Track` 规则保持不变
  - 结构柱/`B` 柱位序号计算正确
- 新增契约测试：
  - 模型/DTO/补列脚本包含 `angle1..6`
  - 导出字段列表包含 `angle1..6`
  - 订单详情渲染包含 `Angle 1..6`

## 7. 验证

- 运行 `npm test`
- 手动核对：
  - `Full Height / Tier on Tier / Café style`
  - `Bypass Track`
  - 新建订单
  - 编辑订单
  - 订单详情
  - 管理员详情
  - Excel 导出字段配置
