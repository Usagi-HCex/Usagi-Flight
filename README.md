# Personal Flight Log Management System

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md)

A lightweight personal flight log application for Cloudflare. It stores encrypted flight records in D1, serves static dashboard/mobile pages, renders great-circle route maps from generated static airport data, and can be deployed either as Cloudflare Pages Functions or as a Cloudflare Worker with Workers Static Assets.

The default deployment target is still Cloudflare Pages. Workers support is additive and reuses the same API handlers.

---

## Features

- Add, view, edit, delete, export, and batch-import flight records.
- BLOB-only encrypted record storage in Cloudflare D1.
- Per-record envelope encryption with Cloudflare Secrets based KEK material.
- HMAC-SHA256 integrity value for canonicalized flight payloads.
- Encrypted summary cache for faster list and map views.
- Static OurAirports-derived airport index and static Natural Earth-style world line data.
- WebGL route renderer with desktop and mobile map views.
- Touch-optimized mobile/PWA pages under `mobile/`.
- Mobile add/edit pages can parse IATA BCBP boarding pass data from scanner, image, or pasted text.
- Three-language UI support: English, Simplified Chinese, and Japanese.
- Optional JavaScript protection/obfuscation build output.

---

## Runtime Architecture

```text
Browser / PWA
  ├─ static HTML, CSS, vanilla JavaScript
  ├─ desktop pages at repository root
  ├─ mobile pages under mobile/
  ├─ generated static airport, airline, and world map data
  └─ WebGL route renderer

API layer
  ├─ Pages mode: functions/api/*.js
  └─ Workers mode: workers/api-assets-router.js
       ├─ routes /api/* to the same functions/api handlers
       └─ routes static files to the ASSETS binding

Cloudflare D1
  ├─ flight_records
  ├─ flight_cache
  └─ system_meta
```

The Pages and Workers deployments use the same frontend files, API behavior, D1 schema, cache strategy, and secrets. Workers mode only adds a functional entry file, `workers/api-assets-router.js`, so the API can run behind a Worker while static files come from Workers Static Assets.

---

## Build Targets

Pages keeps the original command:

```bash
npm run build
```

Workers uses an additive target command:

```bash
npm run build:workers
```

Equivalent parameterized form:

```bash
npm run build:target -- --target=workers
```

Generated files are written to `dist/`, `assets/data/`, `assets/icons/`, and `assets/vendor/`. These are build output and should not be committed.

---

## Required Cloudflare Resources

Both deployment modes require:

- D1 binding name: `DB`
- Secrets:
  - `ACTIVE_KEK_VERSION`
  - `KEK_V1_B64`
  - `HMAC_SECRET`

Recommended secret values:

```text
ACTIVE_KEK_VERSION=v1
KEK_V1_B64=<32-byte random AES-KW key encoded as base64>
HMAC_SECRET=<long high-entropy secret>
```

Generate a KEK candidate:

```bash
openssl rand -base64 32
```

---

## D1 Schema

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

## Deploy To Cloudflare Pages

### Pages Dashboard / Git Deployment

Create or open a Cloudflare Pages project connected to the repository, then configure:

```text
Production branch: develop
Build command: npm run build
Build output directory: dist
Root directory: /
Functions directory: functions
```

Add the D1 binding:

```text
Settings -> Functions -> D1 database bindings
Variable name: DB
D1 database: your database
```

Add secrets:

```text
Settings -> Environment variables
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Pages CLI Deployment

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name <pages-project-name> --branch develop
```

Set Pages secrets from CLI:

```bash
npx wrangler pages secret put ACTIVE_KEK_VERSION --project-name <pages-project-name>
npx wrangler pages secret put KEK_V1_B64 --project-name <pages-project-name>
npx wrangler pages secret put HMAC_SECRET --project-name <pages-project-name>
```

Configure the `DB` D1 binding in the Pages dashboard, or use your Cloudflare project configuration workflow if you manage Pages configuration outside the dashboard.

---

## Deploy To Cloudflare Workers

Workers deployment uses:

```text
Worker entry: workers/api-assets-router.js
Static assets directory: dist
Assets binding: ASSETS
D1 binding: DB
```

### Workers Dashboard / Git Deployment

Create a Worker connected to the repository, then configure:

```text
Production branch: develop
Build command: npm run build:workers
Deploy command: npx wrangler deploy --config wrangler.toml
```

Because the real `wrangler.toml` may contain environment-specific D1 IDs, it is ignored by Git. In a dashboard build, either commit a sanitized config that uses non-sensitive environment handling, or generate `wrangler.toml` during the deploy command from dashboard build variables:

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

Dashboard build variables needed by that command:

```text
WORKER_NAME
D1_DATABASE_NAME
D1_DATABASE_ID
```

Add runtime secrets in the Worker settings:

```text
ACTIVE_KEK_VERSION
KEK_V1_B64
HMAC_SECRET
```

### Workers CLI Deployment

Prepare an untracked config:

```bash
cp wrangler.workers.example.toml wrangler.toml
```

Edit `wrangler.toml`:

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

Deploy:

```bash
npm install
npm run build:workers
npx wrangler deploy --config wrangler.toml
```

Set Worker secrets:

```bash
npx wrangler secret put ACTIVE_KEK_VERSION --config wrangler.toml
npx wrangler secret put KEK_V1_B64 --config wrangler.toml
npx wrangler secret put HMAC_SECRET --config wrangler.toml
```

Do not deploy Workers assets from the repository root. The assets directory must be `dist`; otherwise `node_modules/` and other development files may be uploaded as static assets.

---

## API Overview

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

## Static Data

The app does not import the full airport database into D1. Build scripts generate static JSON/GeoJSON files:

```text
assets/data/airport-index.json
assets/data/airline-index.json
assets/data/ne-50m-world-lines.geojson
assets/data/ne-10m-world-lines.geojson
```

Pages serves these from `dist/`; Workers serves them through the `ASSETS` binding.

---

## Acknowledgements

Thanks to [OurAirports](https://ourairports.com/) for providing public airport data used to build the static airport coordinate index.

---

## Local Development

Install dependencies:

```bash
npm install
```

Build static output:

```bash
npm run build
```

Run Pages locally:

```bash
npx wrangler pages dev dist
```

Use `.dev.vars` for local secrets and keep it out of Git.

---

## Repository Hygiene

Never commit:

- `.dev.vars`
- `.env` or `.env.*`
- real D1 IDs, account IDs, API tokens, or production secrets
- D1 exports containing real flight records
- `.wrangler/`
- `dist/`
- `assets/data/`
- `assets/icons/`
- `assets/vendor/`
- `node_modules/`
- `.DS_Store`
- real `wrangler.toml`

---

## License

Licensed under the Apache License 2.0.

Copyright 2026 [Usagi-HCex](https://github.com/Usagi-HCex).

Homepage: [https://usagi-hecex.pages.dev/](https://usagi-hecex.pages.dev/)
