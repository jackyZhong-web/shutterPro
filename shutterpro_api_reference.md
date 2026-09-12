# ShutterPro API 接口大全

这份文档基于当前代码仓库的真实路由、控制器、DTO 和模型整理，可直接用于网页接入 Agent、外部系统联调、接口盘点。

## 1. 基本规则

- 后端默认端口：`3000`
- 当前无版本前缀，接口直接以根路径暴露，例如：`/auth/login`
- 鉴权方式：`Authorization: Bearer <token>`
- JWT 有效期：`8h`
- 除 `/auth/login` 外，其余业务接口都要求登录
- `/admin/*` 与后台管理接口要求 `role === "Admin"`

## 2. 通用响应约定

成功一般返回：

```json
{ "success": "true" }
```

或返回资源对象 / 列表 / 新建后的 `id`

常见失败响应：

```json
{ "error": "unauthorized" }
{ "error": "forbidden" }
{ "error": "not_found" }
{ "error": "invalid_request", "issues": [...] }
{ "error": "server_error" }
```

## 3. 认证接口

### POST `/auth/login`

- 鉴权：否
- 请求体：

```json
{
  "loginName": "admin",
  "password": "123456"
}
```

- 返回：

```json
{
  "token": "jwt-token",
  "role": "Admin",
  "user": {
    "id": "user-id",
    "companyId": "company-id",
    "customerName": "Alice",
    "email": "a@b.com"
  }
}
```

### GET `/auth/me`

- 鉴权：是
- 返回当前登录用户：

```json
{
  "id": "user-id",
  "role": "Admin",
  "companyId": "company-id",
  "customerName": "Alice",
  "email": "a@b.com"
}
```

### PUT `/auth/change-password`

- 鉴权：是
- 请求体：

```json
{
  "currentPassword": "old",
  "newPassword": "new"
}
```

- 返回：

```json
{ "success": "true" }
```

## 4. 基础目录接口

### GET `/materials`

- 鉴权：是
- 作用：返回产品材料字典
- 返回：

```json
[
  { "code": "Hollow", "label": "LARK™ Lightweight Shutters" },
  { "code": "Basswood", "label": "CARVER™ Wood Shutters" }
]
```

说明：

- `code` 是内部标识，保存到数据库
- `label` 是前端显示文案

### GET `/profiles`

- 鉴权：是
- Query：
  - `material` 可选
  - `category` 可选
- 返回：`profiles` 列表

单项结构：

```json
{
  "id": "profile-id",
  "material": "Basswood",
  "category": "Stile",
  "name": "XX",
  "imageUrl": "/files/xxx",
  "data": "xx",
  "kdCode": "KD001",
  "customerCode": "CUS001"
}
```

### GET `/colors`

- 鉴权：是
- Query：
  - `companyId` 可选
- 返回：`colors` 列表

单项结构：

```json
{
  "id": "color-id",
  "companyId": "company-id",
  "colorList": "...",
  "colorMapJson": "{...}"
}
```

## 5. 公司当前上下文接口

### GET `/company/current`

- 鉴权：是
- 返回当前登录用户所属公司：

```json
{
  "id": "company-id",
  "name": "TESTING USA",
  "country": "USA"
}
```

### GET `/company/config`

- 鉴权：是
- 返回当前登录用户所属公司的配置
- 返回结构：

```json
{
  "companyId": "company-id",
  "productList": ["Hollow", "Basswood"],
  "styleList": ["Full Height", "Tier on Tier"],
  "profileIds": ["profile-id-1"],
  "tiltOptionList": [],
  "profileMountMap": {
    "profile-id-1": ["IM", "OM"]
  },
  "profileAreaMountMap": {}
}
```

说明：

- `productList` / `styleList` / `profileIds` 在数据库里实际存成 JSON 字符串
- 接口层已经反序列化为数组 / 对象

## 6. 文件接口

### POST `/files`

- 鉴权：是
- 用途：上传后台文件
- Content-Type：`multipart/form-data`
- 文件字段名：`file`
- 其他表单字段：
  - `type` 可选，例如 `excelTemplate`
- 返回：

```json
{
  "id": "file-id",
  "fileName": "template.xlsx",
  "filePath": "/opt/shutterpro/server/uploads/xxx.xlsx",
  "fileType": "excelTemplate"
}
```

说明：

- 当 `type=excelTemplate` 时，仅管理员可上传
- 文件大小限制：`10MB`

### POST `/files/userupload`

- 鉴权：是
- 用途：用户上传图纸等附件
- Content-Type：`multipart/form-data`
- 文件字段名：`file`
- 返回：

```json
{
  "id": "file-id",
  "fileName": "drawing.pdf",
  "filePath": "/opt/shutterpro/server/uploads/userupload/xxx.pdf",
  "fileType": "userupload"
}
```

说明：

- 文件大小限制：`20MB`

### GET `/files/:id`

- 鉴权：是
- 用途：下载 / 查看文件
- Query：
  - `consume=1` 可选，仅导出文件有效，下载后会删除文件记录与物理文件

## 7. 购物车接口

### GET `/cart`

- 鉴权：是
- 返回：

```json
{
  "lines": [
    {
      "id": "line-id",
      "userId": "user-id",
      "product": "Basswood",
      "productLabel": "CARVER™ Wood Shutters",
      "style": "Full Height"
    }
  ],
  "orderNo": "USA-0001"
}
```

说明：

- `orderNo` 是预览单号，还未真正落订单表
- `product` 存的是 `code`
- `productLabel` 是接口层补充的显示字段

### POST `/cart/lines`

- 鉴权：是
- 用途：新增购物车明细
- 请求体：见文档末尾 `Line 对象`
- 返回：

```json
{ "id": "line-id" }
```

### PUT `/cart/lines/:lineId`

- 鉴权：是
- 用途：更新购物车明细
- 请求体：见文档末尾 `Line 对象`
- 返回：

```json
{ "id": "line-id" }
```

### DELETE `/cart/lines/:lineId`

- 鉴权：是
- 返回：

```json
{ "success": "true" }
```

### POST `/cart/save`

- 鉴权：是
- 用途：保存为未提交订单
- 请求体：

```json
{
  "orderReference": "PO-001",
  "po": "PO123",
  "sideMark": "SM123"
}
```

- 返回：

```json
{
  "orderId": "order-id",
  "status": "pending"
}
```

### POST `/cart/send`

- 鉴权：是
- 用途：直接提交订单
- 请求体同 `/cart/save`
- 返回：

```json
{
  "orderId": "order-id",
  "status": "sent"
}
```

## 8. 用户订单接口

### GET `/orders`

- 鉴权：是
- 返回当前用户订单列表

单项结构核心字段：

```json
{
  "id": "order-id",
  "orderNo": "USA-0001",
  "companyId": "company-id",
  "userId": "user-id",
  "orderReference": "Ref001",
  "po": "PO001",
  "sideMark": "SM001",
  "date": "2026-09-05T12:00:00+08:00",
  "status": "pending",
  "sqmTotal": "12.30",
  "customerName": "Alice",
  "companyName": "TESTING USA"
}
```

### GET `/orders/:id`

- 鉴权：是
- 返回单个订单详情
- 返回结构：

```json
{
  "id": "order-id",
  "orderNo": "USA-0001",
  "status": "pending",
  "customerName": "Alice",
  "companyName": "TESTING USA",
  "lines": [
    {
      "id": "line-id",
      "product": "Basswood",
      "productLabel": "CARVER™ Wood Shutters",
      "style": "Full Height"
    }
  ]
}
```

### PUT `/orders/:id`

- 鉴权：是
- 用途：修改未提交订单
- 请求体：

```json
{
  "orderReference": "Ref001",
  "po": "PO001",
  "sideMark": "SM001",
  "lines": [
    {
      "room": "Bedroom",
      "product": "Basswood",
      "style": "Full Height"
    }
  ]
}
```

- 返回：

```json
{ "id": "order-id", "status": "pending" }
```

错误：

- `not_found`
- `cannot_edit_submitted`

### POST `/orders/:id/send`

- 鉴权：是
- 用途：提交已保存订单
- 返回：

```json
{ "id": "order-id", "status": "sent" }
```

### DELETE `/orders/:id`

- 鉴权：是
- 用途：删除未提交订单
- 返回：

```json
{ "success": "true" }
```

错误：

- `not_found`
- `cannot_delete_submitted`

### POST `/orders/:id/export`

- 鉴权：是
- 用途：导出 Excel
- 返回：

```json
{
  "fileId": "file-id",
  "downloadUrl": "/files/file-id"
}
```

说明：

- 导出逻辑会读取 `excel_exports` 中配置的模板与映射规则
- 当前导出时，`product` 已按 `label` 写入 Excel
- 如要真实下载，通常再请求一次：

```text
GET /files/:fileId?consume=1
```

## 9. 管理员订单接口

### GET `/admin/orders`

- 鉴权：是
- 权限：Admin
- 返回所有已发送订单列表

### GET `/admin/orders/:id`

- 鉴权：是
- 权限：Admin
- 返回订单详情，结构与用户详情类似，但不受用户归属限制

### PUT `/admin/orders/:id/mark`

- 鉴权：是
- 权限：Admin
- 请求体：

```json
{ "mark": "Internal note" }
```

- 返回：

```json
{ "success": "true" }
```

### DELETE `/admin/orders/:id`

- 鉴权：是
- 权限：Admin
- 返回：

```json
{ "success": "true" }
```

## 10. Remake 接口

### POST `/remakes`

- 鉴权：是
- 请求体：

```json
{
  "orderId": "order-id",
  "lineId": "line-id",
  "types": ["Wrong Size", "Damage"],
  "note": "Need remake",
  "fileId": "file-id"
}
```

- 返回：创建结果对象
- 常见错误：
  - `order_required`
  - `line_required`
  - `note_required`
  - `types_required`
  - `file_not_found`
  - `line_not_found`
  - `not_found`

### GET `/remakes`

- 鉴权：是
- 返回当前用户自己的 remake 列表

### GET `/admin/remakes`

- 鉴权：是
- 权限：Admin
- Query：
  - `q` 关键字，可选
  - `date` 日期，可选

### GET `/admin/remakes/:id`

- 鉴权：是
- 权限：Admin
- 返回 remake 详情

### PUT `/admin/remakes/:id/approve`

- 鉴权：是
- 权限：Admin
- 返回：

```json
{ "status": "approved" }
```

### PUT `/admin/remakes/:id/refuse`

- 鉴权：是
- 权限：Admin
- 请求体：

```json
{ "comment": "Refuse reason" }
```

- 返回：

```json
{ "status": "refused" }
```

## 11. 管理后台接口

以下接口全部要求：

- 鉴权：是
- 权限：Admin

### 公司管理

#### GET `/companies`

- 返回公司列表，对应表：`companies`

#### POST `/companies`

- 请求体：

```json
{
  "name": "TESTING USA",
  "abbr": "USA",
  "contact": "",
  "street": "",
  "city": "",
  "state": "",
  "zip": "",
  "country": "",
  "addressType": "",
  "phone": "",
  "fax": ""
}
```

- 返回：

```json
{ "id": "company-id" }
```

#### PUT `/companies/:id`

- 请求体同创建
- 返回：

```json
{ "id": "company-id" }
```

#### DELETE `/companies/:id`

- 返回：

```json
{ "success": "true" }
```

### 用户管理

#### GET `/users`

- 返回用户列表，对应表：`users`

#### POST `/users`

- 请求体：

```json
{
  "companyId": "company-id",
  "role": "User",
  "customerName": "Alice",
  "email": "a@b.com",
  "phone": "123",
  "password": "123456"
}
```

- 返回：

```json
{ "id": "user-id" }
```

#### PUT `/users/:id`

- 请求体：

```json
{
  "companyId": "company-id",
  "role": "User",
  "customerName": "Alice",
  "email": "a@b.com",
  "phone": "123",
  "password": ""
}
```

- 返回：

```json
{ "id": "user-id" }
```

#### DELETE `/users/:id`

- 返回：

```json
{ "success": "true" }
```

### Profile 管理

#### GET `/profiles`

- Query：
  - `material`
  - `category`

#### POST `/profiles`

- 请求体：

```json
{
  "material": "Basswood",
  "category": "Stile",
  "name": "Profile A",
  "imageUrl": "/files/xxx",
  "data": "12",
  "kdCode": "KD001",
  "customerCode": "CUS001"
}
```

#### PUT `/profiles/:id`

- 请求体同创建

#### DELETE `/profiles/:id`

- 返回：

```json
{ "success": "true" }
```

### 颜色配置管理

#### GET `/colors`

- Query：
  - `companyId`

#### POST `/colors`

- 请求体：

```json
{
  "companyId": "company-id",
  "colorList": "",
  "colorMap": {
    "default": {
      "shutter": [],
      "hinge": [],
      "tilt": [],
      "louverOpening": "Both"
    },
    "byProduct": {}
  }
}
```

#### PUT `/colors/:id`

- 请求体同创建

#### DELETE `/colors/:id`

- 返回：

```json
{ "success": "true" }
```

说明：

- 接口层吃 `colorMap` 对象
- 数据库存的是 `colorMapJson` 字符串

### 公司配置管理

#### GET `/company-config?companyId=...`

- 返回：

```json
{
  "companyId": "company-id",
  "productList": ["Hollow", "Basswood"],
  "styleList": ["Full Height"],
  "profileIds": ["profile-id"],
  "tiltOptionList": [],
  "profileMountMap": {},
  "profileAreaMountMap": {}
}
```

#### PUT `/company-config/:companyId`

- 请求体：

```json
{
  "productList": ["Hollow", "Basswood"],
  "styleList": ["Full Height", "Tier on Tier"],
  "profileIds": ["profile-id"],
  "tiltOptionList": [],
  "profileMountMap": {
    "profile-id": ["IM", "OM"]
  },
  "profileAreaMountMap": {}
}
```

- 返回：

```json
{ "companyId": "company-id" }
```

说明：

- `productList` 内保存的是产品 `code`，不是 `label`

### Excel 导出配置

#### GET `/excel-export-config`

- 返回当前导出配置

```json
{
  "id": "cfg-id",
  "name": "Default Export",
  "templateFileId": "file-id",
  "ruleJson": "{...}"
}
```

#### PUT `/excel-export-config`

- 请求体：

```json
{
  "name": "Default Export",
  "templateFileId": "file-id",
  "ruleJson": "{\"orderFields\":[],\"lineFields\":[]}"
}
```

- 返回：

```json
{ "id": "cfg-id" }
```

## 12. 核心对象结构

### Line 对象

购物车新增、购物车更新、订单更新里的 `lines[]` 都使用这套结构。

```json
{
  "room": "Bedroom",
  "product": "Basswood",
  "style": "Full Height",
  "width": "1200",
  "height": "1500",
  "panelConfig": "LR",
  "sqm": "1.80",
  "mount": "IM",
  "criticalMidRail": "NO",
  "horizontalTpost": "NO",
  "tiltOption": "Center",
  "midRail1": "",
  "midRail2": "",
  "split1": "",
  "split2": "",
  "tierOnTier1": "",
  "tierOnTier2": "",
  "firstPanelOpening": "Left",
  "postPosition1": "",
  "postPosition2": "",
  "postPosition3": "",
  "postPosition4": "",
  "postPosition5": "",
  "postPosition6": "",
  "angle1": "",
  "angle2": "",
  "angle3": "",
  "angle4": "",
  "angle5": "",
  "angle6": "",
  "louvresOpening": "1way",
  "louvresSize": "89",
  "stile": "",
  "tpost": "",
  "frameType": "",
  "frameSideLeft": "",
  "frameSideRight": "",
  "frameSideTop": "",
  "frameSideBottom": "",
  "cilplatesLeft": "",
  "cilplatesRight": "",
  "cilplatesTop": "",
  "cilplatesBottom": "",
  "buildUpLeft": "",
  "buildUpRight": "",
  "buildUpTop": "",
  "buildUpBottom": "",
  "battensWidth": "",
  "battensDepth": "",
  "battensHeight": "",
  "shutterColor": "",
  "hingeColor": "",
  "notes": "",
  "slidingOption": "",
  "trackOption": "",
  "shapeType": "",
  "drawingUpload": "",
  "drawingUploadFileId": ""
}
```

### Order Header 对象

```json
{
  "orderReference": "Ref001",
  "po": "PO001",
  "sideMark": "SM001"
}
```

## 13. Agent 集成建议

如果你要把网页功能接到 Agent，推荐按下面分层：

1. 认证层：
   - `/auth/login`
   - `/auth/me`

2. 基础字典层：
   - `/materials`
   - `/profiles`
   - `/colors`
   - `/company/current`
   - `/company/config`

3. 下单层：
   - `/cart`
   - `/cart/lines`
   - `/cart/save`
   - `/cart/send`
   - `/orders`
   - `/orders/:id`
   - `/orders/:id/send`

4. 文件层：
   - `/files`
   - `/files/userupload`
   - `/files/:id`

5. 售后层：
   - `/remakes`
   - `/admin/remakes*`

6. 管理层：
   - `/companies`
   - `/users`
   - `/profiles`
   - `/colors`
   - `/company-config`
   - `/excel-export-config`

## 14. 当前特别需要记住的约束

- 材料 `code` 只做内部标识，数据库和配置表里保存的是 `code`
- 前端显示与导出应显示 `label`
- `orders` 表头不存 `product`，产品在 `order_lines.product`
- `company_configs.productList` 保存的是产品 `code` 数组
- `colors.colorMapJson.byProduct` 的 key 也是产品 `code`

