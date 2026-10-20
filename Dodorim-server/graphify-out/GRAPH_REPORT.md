# Graph Report - Dodorim-server  (2026-10-13)

## Corpus Check
- Corpus is ~6,653 words - fits in a single context window. You may not need a graph.

## Summary
- 121 nodes · 299 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.86)
- Token cost: 44,302 input · 0 output

## Community Hubs (Navigation)
- Post & Notice Storage
- DB Query Routes
- Deployment & Docs
- Package Manifest
- Server Bootstrap & TTS
- Admin Authentication

## God Nodes (most connected - your core abstractions)
1. `httpError()` - 20 edges
2. `query()` - 16 edges
3. `findOr404()` - 11 edges
4. `dir()` - 10 edges
5. `fileUrl()` - 10 edges
6. `express` - 9 edges
7. `text()` - 9 edges
8. `requireAdmin()` - 8 edges
9. `intId()` - 8 edges
10. `moveInto()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `toBanner()` --calls--> `fileUrl()`  [EXTRACTED]
  src/routes/banners.js → src/storage.js
- `toCategory()` --calls--> `fileUrl()`  [EXTRACTED]
  src/routes/categories.js → src/storage.js
- `NAS Docker Deployment` --references--> `app service`  [INFERRED]
  README.md → docker-compose.yml
- `requireAdmin()` --calls--> `httpError()`  [EXTRACTED]
  src/auth.js → src/util.js
- `ensureAdmin()` --calls--> `query()`  [EXTRACTED]
  src/auth.js → src/db.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **TTS Speech Flow** — readme_tts_speech, readme_speech_providers, readme_google_cloud_tts, readme_tts_cache, readme_browser_speechsynthesis [EXTRACTED 1.00]
- **Docker Compose Stack** — docker_compose_app, docker_compose_db, docker_compose_db_healthcheck, docker_compose_mariadb_volume, docker_compose_storage_volume [EXTRACTED 1.00]

## Communities (7 total, 1 thin omitted)

### Community 0 - "Post & Notice Storage"
Cohesion: 0.17
Nodes (23): noticesRouter, toNotice(), writeContent(), readSlide(), toPost(), dir(), DOCS, exists() (+15 more)

### Community 1 - "DB Query Routes"
Cohesion: 0.19
Nodes (19): pool, query(), getBanner(), toBanner(), categoriesRouter, getCategory(), toCategory(), getNotice() (+11 more)

### Community 2 - "Deployment & Docs"
Cohesion: 0.15
Nodes (17): app service, db service (mariadb:11.4), MariaDB healthcheck, ./data/mariadb volume, ./data/storage volume, Admin Bearer Token Auth, REST API Summary, Browser speechSynthesis Fallback (+9 more)

### Community 3 - "Package Manifest"
Cohesion: 0.11
Nodes (17): dependencies, express, multer, mysql2, engines, node, name, private (+9 more)

### Community 4 - "Server Bootstrap & TTS"
Cohesion: 0.16
Nodes (12): checkSecret(), waitForDb(), app, FRONTEND_DIR, PORT, start(), bannersRouter, postsRouter (+4 more)

### Community 5 - "Admin Authentication"
Cohesion: 0.25
Nodes (9): authRouter, ensureAdmin(), failures, hashPassword(), requireAdmin(), sign(), signToken(), TOKEN_HOURS (+1 more)

## Knowledge Gaps
- **4 isolated node(s):** `Dodorim React Frontend`, `Admin Bearer Token Auth`, `MariaDB healthcheck`, `./data/mariadb volume`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 32 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Package Manifest` to `Post & Notice Storage`, `DB Query Routes`, `Server Bootstrap & TTS`, `Admin Authentication`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `query()` (e.g. with `getBanner()` and `getCategory()`) actually correct?**
  _`query()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Dodorim React Frontend`, `Admin Bearer Token Auth`, `MariaDB healthcheck` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `multer` connect `Package Manifest` to `Post & Notice Storage`, `Server Bootstrap & TTS`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._