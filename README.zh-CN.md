# 个人飞行日志管理系统

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md)

这是一个运行在 Cloudflare 上的轻量级个人飞行日志系统。它使用 D1 保存加密后的航班记录，提供桌面端和移动端静态页面，使用构建阶段生成的机场与地图数据绘制大圆航线地图，并且可以部署为 Cloudflare Pages Functions，也可以部署为带 Workers Static Assets 的 Cloudflare Worker。

默认部署目标仍然是 Cloudflare Pages。Workers 支持是新增兼容层，复用同一套 API handler。

---

## 功能

- 新增、查看、修改、删除、导出和 CSV 批量导入航班记录。
- Cloudflare D1 中只保存 BLOB 加密记录。
- 每条记录使用独立 DEK，并通过 Cloudflare Secrets 中的 KEK 做信封加密。
- 对规范化后的航班 payload 计算 HMAC-SHA256 完整性值。
- 使用加密 summary cache 加速列表和地图统计。
- 使用 OurAirports 机场数据和 Natural Earth 风格地图线数据生成静态索引。
- WebGL 航线地图，支持桌面和移动端。
- `mobile/` 下提供适合触屏/PWA 的移动端页面。
- 移动端新增/编辑页面支持解析 IATA BCBP 登机牌数据。
- UI 支持英文、简体中文、日文。
- 构建输出可选 JavaScript 保护/混淆。

---

## 当前架构

```text
浏览器 / PWA
  ├─ 静态 HTML、CSS、原生 JavaScript
  ├─ 根目录下的桌面端页面
  ├─ mobile/ 下的移动端页面
  ├─ 构建生成的机场、航司和世界地图数据
  └─ WebGL 航线渲染器

API 层
  ├─ Pages 模式：functions/api/*.js
  └─ Workers 模式：workers/api-assets-router.js
       ├─ 将 /api/* 路由到同一套 functions/api handler
       └─ 将静态文件请求交给 ASSETS binding

Cloudflare D1
  ├─ flight_records
  ├─ flight_cache
  └─ system_meta
```

Pages 和 Workers 两种部署模式使用同一套前端、API 行为、D1 schema、缓存策略和 secrets。Workers 模式只增加一个功能命名的入口文件 `workers/api-assets-router.js`。

---

## 构建目标

Pages 保持原来的构建命令：

```bash
npm run build
```

Workers 使用新增命令：

```bash
npm run build:workers
```

等价的参数形式：

```bash
npm run build:target -- --target=workers
```

生成内容会写入 `dist/`、`assets/data/`、`assets/icons/`、`assets/vendor/`，这些都是构建产物，不应提交到 Git。

---

## 必需的 Cloudflare 资源

两种部署模式都需要：

- D1 binding 名称：`DB`
- Secrets：
  - `ACTIVE_KEK_VERSION`
  - `KEK_V1_B64`
  - `HMAC_SECRET`

推荐值：

```text
ACTIVE_KEK_VERSION=v1
KEK_V1_B64=<32-byte random AES-KW key encoded as base64>
HMAC_SECRET=<long high-entropy secret>
```

生成 KEK 候选值：

```bash
openssl rand -base64 32
```

---

## D1 初始化 SQL

```sql
CREATE TABLE IF NOT EXISTS flight_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_no INTEGER UNIQUE,
  record_uuid TEXT NOT NULL,
  key_version TEXT NOT NULL,
  wrapped_dek BLOB NOT NULL,
  data_iv BLOB NOT NULL,
  ciphertext BLOB NOT NULL,
  hmac_value_blob BLOB NOT NULL,
  payload_version INTEGER NOT NULL DEFAULT 2,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flight_cache (
  cache_key TEXT PRIMARY KEY,
  cache_uuid TEXT NOT NULL,
  key_version TEXT NOT NULL,
  wrapped_dek BLOB NOT NULL,
  data_iv BLOB NOT NULL,
  ciphertext BLOB NOT NULL,
  hmac_value BLOB NOT NULL,
  content_encoding TEXT DEFAULT 'gzip',
  source_revision INTEGER NOT NULL,
  records_total INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_meta (key, value, updated_at)
VALUES ('flight_records_revision', '1', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_flight_records_record_no
ON flight_records(record_no);

CREATE INDEX IF NOT EXISTS idx_flight_records_hmac_hex
ON flight_records(lower(hex(hmac_value_blob)));
```

---

## 部署到 Cloudflare Pages

### Pages 网页版 / Git 部署

在 Cloudflare Pages 中连接仓库，然后设置：

```text
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /
Functions directory: functions
```

添加 D1 binding：

```text
Settings -> Functions -> D1 database bindings
Variable name: DB
D1 database: 选择你的数据库
```

添加 Secrets：

```text
Settings -> Environment variables
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Pages CLI 部署

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name <pages-project-name> --branch main
```

CLI 设置 Pages secrets：

```bash
npx wrangler pages secret put ACTIVE_KEK_VERSION --project-name <pages-project-name>
npx wrangler pages secret put KEK_V1_B64 --project-name <pages-project-name>
npx wrangler pages secret put HMAC_SECRET --project-name <pages-project-name>
```

`DB` D1 binding 可以在 Pages 网页后台设置；如果你用其他方式管理 Cloudflare 项目配置，也可以按对应流程配置。

---

## 部署到 Cloudflare Workers

Workers 部署使用：

```text
Worker entry: workers/api-assets-router.js
Static assets directory: dist
Assets binding: ASSETS
D1 binding: DB
```

### Workers 网页版 / Git 部署

创建并连接仓库后设置：

```text
Production branch: main
Build command: npm run build:workers
Deploy command: npx wrangler deploy --config wrangler.toml
```

真实 `wrangler.toml` 可能包含环境专属 D1 ID，所以默认不提交。网页构建中可以通过构建环境变量临时生成：

```bash
cat > wrangler.toml <<EOF
name = "$WORKER_NAME"
main = "workers/api-assets-router.js"
compatibility_date = "2026-06-03"
keep_vars = true

[assets]
directory = "./dist"
binding = "ASSETS"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "$D1_DATABASE_NAME"
database_id = "$D1_DATABASE_ID"
EOF

npx wrangler deploy --config wrangler.toml
```

需要在网页后台添加这些构建变量：

```text
WORKER_NAME
D1_DATABASE_NAME
D1_DATABASE_ID
```

同时在 Worker 运行时变量/Secrets 中添加：

```text
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Workers CLI 部署

准备本地未提交的配置文件：

```bash
cp wrangler.workers.example.toml wrangler.toml
```

编辑 `wrangler.toml`：

```toml
name = "flight-log-api"
main = "workers/api-assets-router.js"
compatibility_date = "2026-06-03"
keep_vars = true

[assets]
directory = "./dist"
binding = "ASSETS"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "your-d1-database-name"
database_id = "your-d1-database-id"
```

部署：

```bash
npm install
npm run build:workers
npx wrangler deploy --config wrangler.toml
```

设置 Worker secrets：

```bash
npx wrangler secret put ACTIVE_KEK_VERSION --config wrangler.toml
npx wrangler secret put KEK_V1_B64 --config wrangler.toml
npx wrangler secret put HMAC_SECRET --config wrangler.toml
```

Workers 的静态资源目录必须是 `dist`，不要指向仓库根目录，否则会把 `node_modules/` 等开发文件当成 assets 上传。

---

## API 概览

```text
GET    /api/flights?limit=10&page=1
POST   /api/flights
GET    /api/flight?id=<internal_id>
PUT    /api/flight?id=<internal_id>
DELETE /api/flight?id=<internal_id>
GET    /api/export_flights
GET    /api/flight_map_summary
POST   /api/import_flights
```

---

## 静态数据

项目不会把完整机场数据库导入 D1。构建脚本生成这些静态文件：

```text
assets/data/airport-index.json
assets/data/airline-index.json
assets/data/ne-50m-world-lines.geojson
assets/data/ne-10m-world-lines.geojson
```

Pages 从 `dist/` 提供这些文件；Workers 通过 `ASSETS` binding 提供这些文件。

---

## 致谢

感谢 [OurAirports](https://ourairports.com/) 提供公开机场数据，本项目使用这些数据构建静态机场坐标索引。

---

## 本地开发

```bash
npm install
npm run build
npx wrangler pages dev dist
```

本地 secrets 放在 `.dev.vars`，不要提交。

---

## 仓库卫生

不要提交：

- `.dev.vars`
- `.env` 或 `.env.*`
- 真实 D1 ID、account ID、API token、生产 secrets
- 包含真实航班记录的 D1 导出
- `.wrangler/`
- `dist/`
- `assets/data/`
- `assets/icons/`
- `assets/vendor/`
- `node_modules/`
- `.DS_Store`
- 真实 `wrangler.toml`

---

## 许可证

基于 Apache License 2.0 授权。

Copyright 2026 [Usagi-HCex](https://github.com/Usagi-HCex).

主页：[https://usagi-hecex.pages.dev/](https://usagi-hecex.pages.dev/)
