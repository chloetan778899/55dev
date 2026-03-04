安装 npm install 下载所有必要的依赖包，如 vue, vite, three 等


**1. 部署与环境要求**

**1.1** 核心注意：双版本网站部署
在前端打包出来的 `index.html` 里面，包含了一段特定的 JavaScript 脚本（`/js/dd7151.js`）。
根据业务要求，我们需要部署 **两个不同版本** 的网站，请务必注意区分：

外网正式服（给真实用户用的）：👉必须包含 这段 JS 脚本，直接正常部署即可。

内网测试服（给自己人内部用的）：👉绝对不能包含 这段 JS 脚本！请在服务器部署时，手动把 `index.html` 里的这段 JS 代码删掉或注释掉。

**1.2** 路由刷新 404 问题 (History Mode)
前端路由使用的是 History 模式。你们在配置 Nginx 或其他 Web 服务器时，请务必加上 路由回退（Fallback）配置 ，否则用户在非首页刷新会报 404 错误。

    Nginx 配置示例：
    nginx
    location / {
        try_files $uri $uri/ /index.html;
    }



---------------------------------------------------------------------------
**2. 核心 API 接口清单**

全局接口路径与调试说明

前端代码中目前存在一些占位的 API 请求地址（例如代码里的 `httpxxxx` 或 `https://后端链接/images` 等）。在正式对接和生产环境中，前端会将这些请求统一改为相对路径（如 `/api/submit`，`/api/contact` 等）。请后端统一配置好 `/api` 前缀来进行路由分发。

目前前端页面只预留了以下几个 HTTP 接口，请后端按照以下格式提供 API。

**接口 1**: 账号注册 (Create Account)
请求路径: POST /api/submit

前端发送格式:
    {
    "payload": {
        "email": "user@example.com",
        "phone": "123456789",       // 纯数字，前端已处理掉空格和+号
        "password": "Password123",  // 【更新】密码强制要求：最少6个字符，且必须包含至少1个大写、1个小写和1个数字。
        "displayName": "用户昵称",
        "refId": "推荐码",
        "yob": 1995,                // 出生年份
        "botCheck": "",             // 隐藏的防机器人字段（Honeypot），正常人类提交时该字段必定为空字符串
        "humanVerified": false      // 仅作占位，前端目前使用的是静态验证 UI，后端请勿强校验此字段为 true
    }
    }

逻辑说明: 注册成功请返回 HTTP 200。前端收到 200 OK 后，会自动帮用户调一次下面的登录接口。

**接口 2**: 账号登录 (Sign In)
请求路径: POST /api/login

前端发送格式:
    {
    "account": "user@example.com", // 目前固定传用户填写的账号/邮箱
    "password": "Password123"
    }

期望返回格式:
    {
    "token": "eyJhxxxxxx..."       // 必须返回 token 字段，前端会自动存入 localStorage
    }

**接口 3**: 联系我们表单 (Get in touch)
请求路径: POST /api/contact （暂定，后端可按需更改）

前端发送格式 (JSON):
    {
    "name": "用户填写的名字",
    "email": "user@example.com",
    "message": "用户填写的具体留言内容"
    }

逻辑说明: 用于接收首页底部的用户留言。成功处理后请返回 HTTP 200，前端会自动展示“发送成功”的 UI 提示。

**接口 4**: 获取合规认证图片 (Get Compliance Images) - 可选
请求路径: GET /api/images

前端逻辑说明: 
用于在“Terms & Conditions”页面的 Registration 协议下方动态展示合规认证证书/图片。如果不需要展示图片，后端可以返回空数组 `[]`，前端会自动隐藏该区域。

期望返回格式 (JSON 数组):
    [
    {
        "id": "1",               // 图片的唯一 ID
        "url": "https://..."     // 图片的完整外链地址
    },
    {
        "id": "2",
        "url": "https://..."
    }
    ]



---------------------------------------------------------------------------
**3. 错误状态处理**
为了配合前端的多国语言 (i18n) 翻译，当【登录】或【注册】失败时，请后端返回 非 200 状态码，并在 JSON 中返回特定的英文错误关键词。

后端返回示例：
    { 
    "msg": "email already exists" 
    }

前端会自动拦截以下关键词并展示本地化弹窗：
【登录/注册 场景】
    包含 `credential` / `not found` ➡️ 前端显示：账号或密码错误
    包含 `email already exists` ➡️ 前端显示：邮箱已被注册
    包含 `display name` ➡️ 前端显示：昵称已被占用
    包含 `phone` ➡️ 前端显示：手机号已被占用
    包含 `referrer` / `refid` ➡️ 前端显示：推荐码无效

【账户设置/修改密码 场景】
    包含 `incorrect` / `password` ➡️ 前端显示：当前密码错误 (Incorrect current password)
    包含 `email` / `mismatch` / `match` ➡️ 前端显示：验证邮箱与注册邮箱不符 (Email does not match our records)
    包含 `passphrase` / `incorrect` ➡️ 前端显示：当前资金密码错误 (Current passphrase incorrect)



---------------------------------------------------------------------------
**4. 前端已内部消化的功能（后端无需处理）**
为了节省大家沟通成本，以下功能全部由前端本地实现，不需要任何接口支持：

a. 暗色/亮色主题切换：全盘前端 CSS 控制。

b. 多国语言切换 (i18n)：语言包存在前端本地，无缝切换。

c. 复杂动效：包括打字机效果、首页 3D 地球、鼠标跟随高亮、数据流动画等。

d. 表单强验证：邮箱正则、密码复杂度验证、出生年份合法性、手机号国际区号识别等，提交给后端的必定是初步合法的数据。

e.底部协议跳转：T&C、Privacy 等纯前端内部路由跳转。



---------------------------------------------------------------------------
**5. 账户设置与资金密码 API (Account Settings & Overview)**

**接口 5**: 获取用户资料 (Get User Profile)
请求路径: GET /api/user/profile
期望返回格式 (JSON):
    {
    "displayName": "前端注册时填写的昵称",
    "accountTier": "Standard Tier",
    "profilePicUrl": "https://...",
    "referralId": "REF-ALEX99",
    "hasPassphrase": false,
    "email": "user@example.com",
    "region": "US",
    "isCoachAccount": false,         // 【新增】布尔值。判断是否为教练/测试账号。若为true，前端会显示教练横幅标识。
    "createdAt": "2024-10-01T11:00:00Z"
    }

**接口 6**: 上传头像 (Upload Avatar)
请求路径: POST /api/user/avatar  (Content-Type: multipart/form-data)
返回格式: { "url": "上传成功后的新图片链接" }

**接口 7**: 修改登录密码 (Update Password)
请求路径: POST /api/user/password
前端发送格式: { "oldPassword": "...", "newPassword": "..." }
// 【更新】前端已增加强验证规则：新密码必须最少6个字符，且包含至少1个大写字母、1个小写字母和1个数字。请后端保持验证规则一致。

**接口 8**: 首次设置资金密码 (Setup Payout Passphrase)
请求路径: POST /api/user/passphrase/setup
前端发送格式: { "country": "US", "verifyEmail": "user@email.com", "passphrase": "123" }
// 【业务逻辑】极度重要！必须校验 verifyEmail 是否与该账户注册邮箱完全一致。不一致请返回包含 "mismatch" 关键词的错误。
// 【更新】资金密码规则：最少6个字符（无大小写或数字强制要求）。请后端保持规则一致。

**接口 9**: 修改已有的资金密码 (Update Passphrase)
请求路径: PUT /api/user/passphrase/update
前端发送格式: { "currentPassphrase": "...", "newPassphrase": "..." }
// 【更新】资金密码规则：最少6个字符（无大小写或数字强制要求）。



---------------------------------------------------------------------------
**6. 绩效奖励 API (Performance Rewards)**

前端完全由后端的返回值来自动点亮或灰置用户的“签到进度条”(Timeline)，同时加载限时福利海报。后端只需提供最基础的数据，无需计算复杂的里程碑。

**接口 10**: 获取用户签到进度 (Get Attendance Streak)
请求路径: GET /api/user/attendance
前端逻辑说明: 前端已写死了里程碑节点（第7, 14, 21, 28天）以及全勤奖的逻辑。后端 **不需要** 返回复杂的列表，只需要告诉前端该用户当前总共打卡/签到了多少次即可。前端会基于 `currentStreak` 自动计算UI变化。
期望返回格式 (JSON):
    {
    "currentStreak": 5,    // 核心字段！代表用户目前实际已签到的总天数。前端会依此自动点亮进度条。
    "totalDays": 31        // （可选）当月总天数。如果不传，前端默认根据自然月天数自动计算。
    }

**接口 11**: 获取限时活动海报 (Get Promotions/Posters)
请求路径: GET /api/promotions
前端逻辑说明: 如果当前没有活动，后端直接返回空数组 `[]`，前端将自动展示 "No active events at this time."；如果有活动海报，前端支持图片画廊的横向左右滑动查看。
期望返回格式 (JSON 数组):
    [
    {
        "id": 1,
        "url": "https://...", // 活动海报的完整图片外链
        "title": "Promo 1"
    },
    {
        "id": 2,
        "url": "https://...", // 支持多张图片
        "title": "Promo 2"
    }
    ]

---------------------------------------------------------------------------
**7. 活动分配与资金明细 API (Active Assignments & Ledger)**
【更新】UI 术语已全盘更改：前端所有出现 "Task(s)" 的地方现已统一替换为 "Assignment(s)" (分配)。API 端点名称 (如 `/api/assignments/*`) 保持不变以完美契合新名称。

此模块的资金计算（包括各种余额的加减）完全由 **前端本地驱动 (Frontend-driven)**，以确保用户拥有即时的操作反馈。但前端依赖后端提供基础的数据同步和验证。请后端仔细阅读以下核心概念和对应的 API：

【核心业务逻辑词汇表】
1. **Coach Account (测试账号/教练账号):** 基于接口 `/api/user/profile` 返回的 `isCoachAccount: boolean` 字段。如果为 true，前端界面顶部会显示一个蓝色的测试账号标志。
2. **Total Ledger Balance (总账本余额):**
   用户账户内所有资金的总和，包含本金、利润以及后台加款。
3. **Current Cycle Profit (当前周期利润):**
   用户在当前轮次/周期中累积产生的所有收益（Yield）。当后端决定重置周期时，此利润归零，且前端的配额 (Quota) 会恢复到后端设定的默认上限 (取决于 `maxSchemaQuota`)
4. **Current Balance (当前余额):**
   预测余额，即“总账本余额” 加上 “当前正挂在屏幕上等待上传的产品的利润” 的总和。
5. **Normal Schema (普通产品):**
   该产品的 Asset Value（资产价值） <= Total Ledger Balance（总账本余额）。
   👉 **前端逻辑:** 用户点击 Sync 获取到该产品时，前端会立刻从 Ledger Balance 中扣除该资产价值。当用户点击上传 (Upload) 成功后，前端会将该资产价值及其产生的利润 (Yield) 一同加回到 Ledger Balance 中。
6. **High-Yield Package (高收益连单/大单包):**
   该产品的 Asset Value（资产价值） > Total Ledger Balance（总账本余额）。它可能包含 1 个或多个连续的产品。
   👉 **前端逻辑:** 用户获取到此类包时，前端**不会**立刻扣除余额，而是计算并展示 Outstanding Balance（未偿余额）。只有当用户把包里的所有产品全部完成上传后，前端才会将所有资金和利润**一次性（Lump sum）**返还到 Ledger Balance 中。
   👉 **多产品连单:** 如果此包包含两个或更多产品，它们会在 Recent Activity (近期活动记录) 中同时显示为 `Pending` 状态。当用户点击上传完成第 1 个产品后，前端会自动触发接口调出第 2 个产品，无需用户手动再次点击 Sync。
7. **Outstanding Balance (未偿余额 / 补齐差额):**
   计算公式：`资产价值 (Asset Value) - 总账本余额 (Ledger Balance)`。仅在 High-Yield Package 下产生。如果此差额大于 0，前端会锁定上传按钮，直到后端为用户账户增加资金（补齐差额）。
8. **后端加款 (Added Funds):**
   如果遇到差额，后端可通过后台管理系统为该用户充值。加款分为两种：
   - Silent Add Funds (静默加款): 资金直接增加，用户不知情。
   - Celebrate Add Funds (礼花加款): 资金增加，前端会弹出全屏彩带动效和提示框。
   **注意:** 前端没有做轮询（Polling），请后端在加款动作发生时，妥善更新数据库，前端在每次交互或刷新时会自动对齐最新的余额。如果在连单中间进行了加款，资金仍然会先进入 Ledger Balance 进行展示。


【所需开发的 API 接口】

**接口 12**: 获取初始账本与分配状态 (Init Ledger State)
请求路径: GET /api/assignments/state
期望返回格式
```JSON
    {
        "coreLedgerBalance": 1200.50, // 必填：当前总账本余额
        "currentCycleProfit": 45.00,  // 必填：当前周期累积利润
        "schemaQuota": 38,            // 必填：当前剩余配额
        "maxSchemaQuota": 40,         // 必填：当前周期的总配额上限
        "currentSchema": null,        // 若用户上次离线前屏幕上有未上传的产品，在此原样返回；若无则返回 null
        "activePackage": {            // 追踪当前是否处于连单状态
            "isActive": false, 
            "id": "", 
            "size": 0, 
            "currentIndex": 0, 
            "accumulatedYield": 0 
        },
        "recentActivity": [],         // 数组：近期交易活动记录
        "hasNewCelebrateFunds": false,// 布尔值：如果后端刚刚发放了带有庆祝效果的加款，设为 true
        "newFundsAmount": 0           // 如果上面为 true，提供具体的加款金额用于弹窗展示
    }

**接口 13**: 同步获取下一个产品 (Sync Next Schema)
请求路径: POST /api/assignments/sync
前端发送格式: 
    { 
        "isAutoPackage": false,       // 布尔值：是否是连单自动触发的请求
        "packageId": null,            // 如果是连单中，前端会传当前的包ID
        "packageCurrentIndex": 0      // 如果是连单中，前端会传即将请求的第几个产品
    }
期望返回格式
```JSON
    {
        "schema": {
           "txId": "TX-1234",
           "timestamp": "2026-03-01 10:00:00",
           "reference": "NODE-X...",
           "value": 450.00,           // 资产价值
           "yieldRate": 4.25,         // 后端根据账户等级决定的收益率 (%)
           "yieldImpact": 19.12,      // value * yieldRate
           "isHighYield": false,      // 布尔值：决定这是普通单还是大连单
           "isCorrupted": false,      // 布尔值：是否是损坏的废弃文件
           "image": "https://..."
        },
        "packageInfo": null,          // 仅当 isHighYield 为 true 时必返。例如: { "isActive": true, "id": "PKG-1", "size": 2, "currentIndex": 1, "accumulatedYield": 0 }
        "pendingActivityItems": null  // 仅在首次拉取到包时，如果包里有2个产品，这里返回包含这2个产品基本信息的数组，前端将一并写入近期活动记录显示为 Pending
    }

**接口 14**: 上传产品并结算 (Upload & Process)
请求路径: POST /api/assignments/upload
前端发送格式: 
    { 
        "txId": "TX-1234"             // 前端传回刚刚上传的产品ID
    }
逻辑说明: 前端基于自身本地的数学计算完成界面的状态变更。如果后端验证该 txId 属于普通单，或者属于连单的最后一个单子，请在后端数据库执行真正的资金结算逻辑。成功处理请返回 200。

**8. 前后端对接说明：分配数据 & 收益率（Active Assignments）**
1. 动态收益率读取 (`/api/assignments/state` & `/api/assignments/sync`)**：当前“分配面板”顶部网格中的收益率（Yield Rate）已经改为动态读取后端提供的 `currentSchema.yieldRate`，不再使用前端写死的值。
   - 重要提示：后端在返回 `schema` 对象时，必须包含一个 `yieldRate` 字段（例如 `"yieldRate": 4.25`）。
   - 如果当前没有未完成的分配任务（即 `currentSchema` 为 `null`），前端将默认显示横杠 `-` 以防误导用户。

# 前后端对接说明：提现管理 (`/api/payouts/request`)
提现管理（Manage Payouts）页面已经与后端完全连接，以下是前端逻辑、拦截规则和期望的请求格式说明：

# 前端表单拦截规则
1. 强制完成分配配额： 如果用户的当前活动分配额度尚未完成（即 `schemaQuota > 0`），前端将禁止发起提现请求，并弹出错误提示。
2. 余额不足拦截： 如果提现金额（Amount）大于用户当前的本地总余额（`displayTotalLedgerBalance`），将会被拦截。
3. 必填项检查： “提现金额”和“提现密码”不可为空。

# 发送给后端的请求格式
用户点击“发起提现”后，前端会向 `/api/payouts/request` 发送 `POST` 请求，包含以下 JSON 格式：

    ```json
    {
    "amount": 3450.50,
    "passphrase": "user_private_key",
    "country": "US",
    "type": "crypto_only", // 或者 "bank" (视国家配置而定)
    "token": "ETH",
    "network": "ERC-20",
    "destination": "0xABC123...",
    "bankDetails": {
        "bankName": "HSBC",
        "bankCode": "004",
        "branchCode": "123",
        "account": "12345678"
    }
    }

# 前后端对接说明：提现管理 (`/api/payouts` & `/api/payouts/request`)
提现管理（Manage Payouts）页面已经与后端完全连接，以下是前端逻辑、拦截规则和期望的请求格式说明：

**接口 15**: 获取提现历史记录 (Get Payout History)
请求路径: GET /api/payouts
前端逻辑说明: 用户进入 "Manage Payouts" 页面时，前端会自动触发此 GET 请求来渲染近期的交易记录表格。
期望返回格式 (JSON):
    {
      "transactions": [
        {
          "id": "TXN-001",
          "timestamp": "2024-05-02 10:00:00",
          "description": "Tokenized Asset Transfer",
          "amount": 3450.50,
          "status": "Pending"   // 状态枚举: "Success", "Approved", "Pending", "Declined", "Rejected"
        }
      ]
    }