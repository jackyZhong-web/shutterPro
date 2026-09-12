# ShutterPro 项目检查报告

## 1. 项目总体结构

这是一个典型的单仓前后端项目：

- 前端：纯静态 HTML/CSS/原生 JavaScript，位于 `client/public`
- 后端：Node.js + Express + Sequelize + MySQL，位于 `server`
- 鉴权：JWT，前端将 token 存在 `localStorage`
- 部署方式：
  - 可由后端直接托管静态资源
  - 也可前后端分开启动

后端静态托管开关在：

- `server/server.js`
- `SERVE_STATIC==="true"` 时托管 `client/public`


## 2. 顶层目录说明

项目根目录当前只有两部分：

- `client`
- `server`

其中：

- `client/public` 为真正前端站点根目录
- `server` 为 API 服务、数据库模型、业务逻辑和上传文件目录


## 3. 后端框架结构

后端采用非常直接的分层方式：

### 3.1 入口层

入口文件：

- `server/server.js`

主要职责：

- 加载 `.env`
- 初始化 Express
- 配置 `helmet`
- 配置 CORS
- 配置双层限流
- 挂载日志与 traceId/requestId
- 绑定所有路由
- 启动数据库初始化

关键挂载顺序：

1. `/auth`
2. `authMiddleware`
3. catalog 路由
4. `/files`
5. company 路由
6. cart 路由
7. orders 路由
8. remakes 路由
9. `adminOnly` 后挂 admin 路由

这意味着：

- 除 `/auth` 外，大多数接口默认都要求登录
- admin 路由是登录后再经过角色校验


### 3.2 routes 层

位于：

- `server/routes`

作用单一：只做 URL 到 controller 的映射。

主要模块：

- `auth.js`
- `catalog.js`
- `company.js`
- `cart.js`
- `orders.js`
- `files.js`
- `remakes.js`
- `admin.js`


### 3.3 controllers 层

位于：

- `server/controllers`

职责：

- 调 `initDb()`
- 做参数校验
- 调 service
- 返回状态码和 JSON

这里没有太多复杂逻辑，属于比较薄的一层。


### 3.4 services 层

位于：

- `server/services`

这是整个后端真正的业务核心。

最关键的服务文件：

- `authService.js`
- `cartService.js`
- `ordersService.js`
- `remakesService.js`
- `companyConfigService.js`
- `filesService.js`
- `adminService.js`


### 3.5 repositories 层

位于：

- `server/repositories`

本质上是对 Sequelize Model 的轻量包装，没有复杂领域抽象。

特点：

- 逻辑非常薄
- 便于快速 CRUD
- 但封装程度不高，复杂业务还是堆在 service 层


### 3.6 models 层

位于：

- `server/models.js`

所有数据库表模型都定义在这个文件里。


## 4. 数据模型总览

### 4.1 基础主数据

- `companies`
- `users`
- `profiles`
- `colors`
- `company_configs`
- `excel_exports`
- `files`

### 4.2 业务交易数据

- `orders`
- `order_lines`
- `cart_lines`
- `remakes`
- `order_sequence`


## 5. 数据库初始化机制

数据库初始化在：

- `server/db.js`

主要逻辑：

1. 自动创建数据库
2. `sequelize.authenticate()`
3. `sequelize.sync({ alter })`
4. 自动补兼容列
5. 自动 seed 初始数据

### 5.1 `DB_ALTER`

当前项目依赖：

- `.env` 中 `DB_ALTER=true`

作用：

- 启动时自动对表结构做兼容补列

补列逻辑包括：

- `drawingUploadFileId`
- `tpost`
- `po`
- `sideMark`
- `colorMapJson`
- `tiltOptionList`
- `profileMountMap`
- `profileAreaMountMap`
- `kdCode`
- `customerCode`

这说明当前项目仍处于持续演进、并依赖运行期自动兼容旧库的状态。


## 6. 核心业务模块

### 6.1 登录与鉴权

前端登录页：

- `client/public/login.html`
- `client/public/js/login.js`

后端：

- `/auth/login`
- `/auth/me`
- `/auth/change-password`

登录逻辑：

1. 用户提交 `loginName + password`
2. 后端按邮箱或 customerName 查用户
3. bcrypt 校验密码
4. 生成 JWT，包含：
   - `id`
   - `role`
   - `companyId`
   - `customerName`
   - `email`
5. 前端保存 token
6. 按角色跳转：
   - Admin -> `admin-company.html`
   - User -> `user-dashboard.html`


### 6.2 Configurator 配置器

前端核心文件：

- `client/public/configurator.html`
- `client/public/js/configurator.js`

这是整个前端最重、最复杂的模块。

职责包括：

- 样式/产品选择
- 宽高输入
- panel config 校验
- unit 切换
- profile 卡片加载
- frame/tpost/louver 逻辑
- company config 过滤
- color config 过滤
- 草稿保存
- drawing upload 上传
- 加入购物车
- 编辑订单行复用

它几乎已经承担了一个小型前端应用的大部分状态管理职责。


### 6.3 购物车

前端：

- `client/public/cart.html`
- `client/public/js/cart.js`

后端：

- `GET /cart`
- `POST /cart/lines`
- `PUT /cart/lines/:lineId`
- `DELETE /cart/lines/:lineId`
- `POST /cart/save`
- `POST /cart/send`

逻辑：

- configurator 先写入 `cart_lines`
- cart 页面展示当前草稿订单
- 提交前必须校验：
  - `PO`
  - `Side Mark`


### 6.4 订单

后端核心：

- `server/services/cartService.js`
- `server/services/ordersService.js`

生成订单流程：

1. 从 `cart_lines` 取当前用户草稿行
2. 生成 orderNo
3. 新建 `orders`
4. 逐行复制到 `order_lines`
5. 清空购物车

订单号生成依赖：

- `order_sequence`

当前是按公司维度递增。

订单状态兼容了历史拼写脏值：

- `sended -> sent`
- `pendding -> pending`

这说明库里已经存在历史脏数据兼容逻辑。


### 6.5 Excel 导出

配置中心：

- `admin-excel.html`
- `client/public/js/admin.js` 中 `initExcel`

后端导出逻辑：

- `server/services/ordersService.js`

流程：

1. 从 `excel_exports` 读取模板配置
2. 从 `files` 表找到模板文件
3. `ExcelJS` 读取模板
4. 按规则把 order/order_line 字段写入单元格
5. 生成导出文件到 `server/uploads`
6. 在 `files` 表新增一条导出文件记录
7. 返回 `/files/:id`

这里高度依赖：

- 模板文件存在
- `files.filePath` 有效


### 6.6 文件上传与下载

核心文件：

- `server/services/filesService.js`
- `server/controllers/filesController.js`

上传接口：

- `POST /files`
- `POST /files/userupload`

下载接口：

- `GET /files/:id`

当前实现的关键特点：

- 文件上传后直接把 `file.path` 存入数据库
- 下载时直接 `res.sendFile(row.filePath)`

也就是说，系统当前是**绝对路径绑定型实现**。

这正是后续跨机器、跨系统恢复文件时最主要的问题来源。


### 6.7 返工单

前端：

- `client/public/remakes.html`
- `client/public/js/remakes.js`

后端：

- `server/services/remakesService.js`

流程：

1. 用户从订单页选中某条 shutter 发起返工
2. 提交：
   - `orderId`
   - `lineId`
   - `types`
   - `note`
   - `fileId`
3. 后端生成返工编号：
   - `RMxx-orderNo`
4. 管理员审批或拒绝


### 6.8 管理后台

后台页面并不是单页应用，而是多张独立 HTML：

- `admin-company.html`
- `admin-user.html`
- `admin-color.html`
- `admin-profile.html`
- `admin-excel.html`
- `admin-order-list.html`
- `admin-remakes.html`
- `admin-config-prototype.html`

后台主脚本：

- `client/public/js/admin.js`

其中 `admin-config-prototype.js` 是一个单独大模块，用于公司级产品、样式、profile、mount、area、颜色等配置。


## 7. Company Config Prototype 的数据归属

这页不是单独一张 prototype 表。

主要保存到：

### 7.1 `company_configs`

保存：

- `productList`
- `styleList`
- `profileIds`
- `profileMountMap`
- `profileAreaMountMap`

### 7.2 `colors`

保存：

- `colorList`
- `colorMapJson`

其中：

- shutter colors
- hinge colors
- tilt options
- louver opening config
- 按 product 维度颜色映射

多数实际已经落在 `colorMapJson` 中。

### 7.3 `profiles`

页面上卡片展示的基础资料来自：

- `profiles`

包括：

- name
- kdCode
- customerCode
- data
- imageUrl

也就是说，这页的 Save 并不会改 profile 主数据本身，而是改 company 维度的可用配置关系。


## 8. 前端页面与脚本映射

### 用户侧

- `login.html` -> `login.js`
- `user-dashboard.html` -> `user-dashboard.js`
- `configurator.html` -> `configurator.js`
- `cart.html` -> `cart.js`
- `order-history.html` -> `orders.js + orders-common.js`
- `order-detail.html` -> `orders.js + orders-common.js`
- `remakes.html` -> `remakes.js`

### 管理侧

- `admin-company.html` -> `admin.js`
- `admin-user.html` -> `admin.js`
- `admin-color.html` -> `admin.js`
- `admin-profile.html` -> `admin.js`
- `admin-excel.html` -> `admin.js`
- `admin-order-list.html` -> `orders.js + orders-common.js + admin.js`
- `admin-remakes.html` -> `remakes.js + admin.js`
- `admin-config-prototype.html` -> `admin.js + admin-config-prototype.js`


## 9. 公共前端基础设施

### 9.1 API 访问

公共文件：

- `client/public/js/api.js`

功能：

- 提供 `window.apiFetch`
- 自动附带 token
- 401 自动跳登录
- 非 3000 端口时默认把请求打向 `http://localhost:3000`


### 9.2 单位换算

公共文件：

- `client/public/js/units.js`

功能：

- 管理 mm/inch 切换
- 格式化长度
- 格式化面积
- 利用 `localStorage` 跨页面同步单位偏好

注意：

- admin 页面强制使用 `mm`


### 9.3 用户菜单与购物车抽屉

公共文件：

- `user-menu.js`
- `cart-drawer.js`

都是页面级增强脚本，不复杂。


## 10. 当前架构的优点

### 10.1 简单直接

没有引入 React/Vue，也没有复杂中间层，阅读成本低。

### 10.2 业务线清晰

主流程非常明确：

- configurator -> cart -> orders -> export/remake

### 10.3 后端结构可改造性强

虽然简单，但 service 集中，后续抽象时切入点明确。


## 11. 当前主要问题与风险

### 11.1 `configurator.js` 过重

这是当前前端最大耦合点。

问题：

- UI、状态、校验、换算、上传、公司配置过滤全部混在一起
- 任意需求变更都可能引发联动回归
- 很难局部修改而不影响别处


### 11.2 文件路径设计有根本缺陷

当前做法是：

- 上传时存绝对路径
- 读取时直接按库里绝对路径找文件

风险：

- 换机器失效
- 换系统失效
- 换盘符失效
- 恢复客户数据困难

这个问题已经在实际恢复过程中暴露过。


### 11.3 配置字段存在“名义保留、实际弃用”

比如：

- `company_configs.tiltOptionList`

字段还在，但业务逻辑已经主要转移到：

- `colors.colorMapJson`

这类状态如果继续积累，会让后续维护者产生误判。


### 11.4 运行期自动改表依赖过强

`DB_ALTER=true` 虽然方便，但风险也明显：

- 启动时隐式改表
- 正式环境结构变化不可控
- 容易把迁移职责混入应用启动


### 11.5 自动化测试几乎为空

当前 `server/tests` 里只有：

- `material-contract.test.js`

它更像契约检查，不是完整业务测试。

意味着：

- 改订单逻辑几乎没有回归保护
- 改 configurator 没有自动验证
- 改 files/export/remake 需要人工全链路验证


### 11.6 历史脏数据兼容已经进入代码

例如订单状态兼容：

- `sended`
- `pendding`

说明数据库历史上已经有不规范数据沉淀。

后续做需求时必须留意：

- 新逻辑不能假设库里数据完全干净


## 12. 后续 Bug 修复与迭代建议

建议按下面顺序推进，而不是同时乱改。

### 第一阶段：先处理稳定性基础设施

1. 为文件系统增加统一路径解析层
2. 把绝对路径存储改为相对路径存储
3. 把旧数据兼容逻辑集中到一个工具函数

优先级非常高，因为这已经影响数据恢复与本地调试。


### 第二阶段：拆 configurator

建议最少拆成：

1. `state`
2. `validation`
3. `render`
4. `api`
5. `profile/color/companyConfig adapter`

否则后续每个需求都会在同一个超大文件上反复堆补丁。


### 第三阶段：补后端测试

至少给下面模块补单测/集成测试：

1. `cartService`
2. `ordersService`
3. `remakesService`
4. `companyConfigService`
5. `filesService`

尤其是：

- 购物车转订单
- 订单导出
- 返工审批
- 配置落库
- 文件读写


### 第四阶段：整理配置字段语义

重点清理：

- `tiltOptionList`
- `colorList`
- `colorMapJson`
- `profileMountMap`
- `profileAreaMountMap`

目标是统一定义：

- 哪些字段是主来源
- 哪些字段只是兼容旧版本


## 13. 当前最重要的技术判断

如果你接下来要持续做这个项目，最该记住的是下面这几条：

1. **前端真正的业务中心不是页面，而是 `configurator.js`**
2. **后端真正的业务中心不是 controller，而是 `cartService/ordersService/remakesService`**
3. **文件路径问题是当前最深层、最容易反复出问题的结构缺陷**
4. **`company_configs` 和 `colors` 共同组成 configurator 的公司级配置**
5. **当前项目几乎没有自动化回归网，改任何核心逻辑都必须自己做链路验证**


## 14. 结论

这套系统不是“架构很先进”的类型，但它的业务主线是清楚的，代码也不算难读。

它当前最大的问题不是看不懂，而是：

- 前端配置器过于集中
- 文件系统路径设计不具备迁移性
- 测试覆盖过低
- 运行时兼容逻辑和历史脏数据已经开始侵入核心代码

如果后面要长期维护，这几个点必须尽快收口，否则每次改需求都会越来越重。
