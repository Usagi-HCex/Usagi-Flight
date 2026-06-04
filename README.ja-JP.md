# 個人フライトログ管理システム

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md)

Cloudflare 上で動作する軽量な個人フライトログアプリです。暗号化されたフライト記録を D1 に保存し、デスクトップ/モバイル向けの静的ページを提供し、ビルド時に生成される空港・地図データを使って大圏航路マップを描画します。Cloudflare Pages Functions としても、Workers Static Assets を使う Cloudflare Worker としてもデプロイできます。

既定のデプロイ先は引き続き Cloudflare Pages です。Workers 対応は追加互換レイヤーであり、同じ API handler を再利用します。

---

## 機能

- フライト記録の追加、表示、編集、削除、エクスポート、CSV 一括インポート。
- Cloudflare D1 には BLOB 形式の暗号化レコードのみ保存。
- レコードごとの DEK と、Cloudflare Secrets に保存した KEK によるエンベロープ暗号化。
- 正規化したフライト payload に対する HMAC-SHA256 完整性値。
- 一覧とマップ統計を高速化する暗号化 summary cache。
- OurAirports 由来の空港インデックスと Natural Earth 風の世界線データを静的生成。
- デスクトップ/モバイル対応の WebGL 航路マップ。
- `mobile/` 以下にタッチ操作向け PWA ページ。
- モバイル追加/編集ページで IATA BCBP 搭乗券データを読み取り可能。
- 英語、簡体中文、日本語 UI。
- 任意の JavaScript 保護/難読化ビルド出力。

---

## 現在のアーキテクチャ

```text
Browser / PWA
  ├─ 静的 HTML、CSS、vanilla JavaScript
  ├─ ルート配下のデスクトップページ
  ├─ mobile/ 配下のモバイルページ
  ├─ ビルド生成の空港、航空会社、世界地図データ
  └─ WebGL 航路レンダラー

API layer
  ├─ Pages mode: functions/api/*.js
  └─ Workers mode: workers/api-assets-router.js
       ├─ /api/* を同じ functions/api handler にルーティング
       └─ 静的ファイルを ASSETS binding に渡す

Cloudflare D1
  ├─ flight_records
  ├─ flight_cache
  └─ system_meta
```

Pages と Workers の両方で、同じフロントエンド、API 動作、D1 schema、cache 戦略、secrets を使います。Workers mode では、機能名の入口ファイル `workers/api-assets-router.js` を追加しているだけです。

---

## ビルドターゲット

Pages は従来通りのコマンドを使います。

```bash
npm run build
```

Workers は追加コマンドを使います。

```bash
npm run build:workers
```

同等のパラメータ形式：

```bash
npm run build:target -- --target=workers
```

生成物は `dist/`、`assets/data/`、`assets/icons/`、`assets/vendor/` に出力されます。これらはビルド出力であり、Git にコミットしません。

---

## 必要な Cloudflare リソース

両方のデプロイ方式で必要です。

- D1 binding 名：`DB`
- Secrets：
  - `ACTIVE_KEK_VERSION`
  - `KEK_V1_B64`
  - `HMAC_SECRET`

推奨値：

```text
ACTIVE_KEK_VERSION=v1
KEK_V1_B64=<32-byte random AES-KW key encoded as base64>
HMAC_SECRET=<long high-entropy secret>
```

KEK 候補の生成：

```bash
openssl rand -base64 32
```

---

## D1 初期化 SQL

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

## Cloudflare Pages へのデプロイ

### Pages ダッシュボード / Git デプロイ

Cloudflare Pages でリポジトリを接続し、次のように設定します。

```text
Production branch: develop
Build command: npm run build
Build output directory: dist
Root directory: /
Functions directory: functions
```

D1 binding を追加します。

```text
Settings -> Functions -> D1 database bindings
Variable name: DB
D1 database: 使用するデータベース
```

Secrets を追加します。

```text
Settings -> Environment variables
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Pages CLI デプロイ

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name <pages-project-name> --branch develop
```

CLI で Pages secrets を設定：

```bash
npx wrangler pages secret put ACTIVE_KEK_VERSION --project-name <pages-project-name>
npx wrangler pages secret put KEK_V1_B64 --project-name <pages-project-name>
npx wrangler pages secret put HMAC_SECRET --project-name <pages-project-name>
```

`DB` D1 binding は Pages ダッシュボードで設定するか、利用している Cloudflare 設定管理フローに従ってください。

---

## Cloudflare Workers へのデプロイ

Workers デプロイでは次を使います。

```text
Worker entry: workers/api-assets-router.js
Static assets directory: dist
Assets binding: ASSETS
D1 binding: DB
```

### Workers ダッシュボード / Git デプロイ

Worker を作成してリポジトリを接続し、次のように設定します。

```text
Production branch: develop
Build command: npm run build:workers
Deploy command: npx wrangler deploy --config wrangler.toml
```

実際の `wrangler.toml` には環境固有の D1 ID が含まれることがあるため、通常はコミットしません。ダッシュボードビルドでは、ビルド変数から一時的に生成できます。

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

必要なダッシュボードのビルド変数：

```text
WORKER_NAME
D1_DATABASE_NAME
D1_DATABASE_ID
```

Worker の runtime variables / secrets にも追加します。

```text
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Workers CLI デプロイ

コミットしないローカル設定を準備します。

```bash
cp wrangler.workers.example.toml wrangler.toml
```

`wrangler.toml` を編集します。

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

デプロイ：

```bash
npm install
npm run build:workers
npx wrangler deploy --config wrangler.toml
```

Worker secrets を設定：

```bash
npx wrangler secret put ACTIVE_KEK_VERSION --config wrangler.toml
npx wrangler secret put KEK_V1_B64 --config wrangler.toml
npx wrangler secret put HMAC_SECRET --config wrangler.toml
```

Workers の静的 assets directory は必ず `dist` にしてください。リポジトリルートを指定すると、`node_modules/` などの開発ファイルまで assets としてアップロードされます。

---

## API 概要

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

## 静的データ

完全な空港データベースは D1 にインポートしません。ビルドスクリプトが静的ファイルを生成します。

```text
assets/data/airport-index.json
assets/data/airline-index.json
assets/data/ne-50m-world-lines.geojson
assets/data/ne-10m-world-lines.geojson
```

Pages は `dist/` から配信し、Workers は `ASSETS` binding 経由で配信します。

---

## 謝辞

静的な空港座標インデックスの生成に使用する公開空港データを提供している [OurAirports](https://ourairports.com/) に感謝します。

---

## ローカル開発

```bash
npm install
npm run build
npx wrangler pages dev dist
```

ローカル secrets は `.dev.vars` に保存し、Git にコミットしません。

---

## リポジトリ衛生

コミットしないもの：

- `.dev.vars`
- `.env` または `.env.*`
- 実際の D1 ID、account ID、API token、本番 secrets
- 実データを含む D1 export
- `.wrangler/`
- `dist/`
- `assets/data/`
- `assets/icons/`
- `assets/vendor/`
- `node_modules/`
- `.DS_Store`
- 実際の `wrangler.toml`

---

## ライセンス

Apache License 2.0 の下でライセンスされています。

Copyright 2026 [Usagi-HCex](https://github.com/Usagi-HCex).

ホームページ：[https://usagi-hecex.pages.dev/](https://usagi-hecex.pages.dev/)
