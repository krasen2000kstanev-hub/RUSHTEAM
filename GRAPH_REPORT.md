# Graph Report - RUSHTEAM  (2026-11-16)

## Corpus Check
- 24 files · ~21,625 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 327 nodes · 836 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90844c3d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- store.js
- role-matrix.test.mjs
- app.js
- mcp.js
- h
- sheets.js
- schedule
- data.js
- tryW
- openVideo
- vHrCompanies
- api.e2e.mjs
- scripts
- preview-server.js

## God Nodes (most connected - your core abstractions)
1. `route()` - 30 edges
2. `h()` - 29 edges
3. `handleDoc()` - 26 edges
4. `schedule()` - 18 edges
5. `render()` - 17 edges
6. `tryW()` - 15 edges
7. `vHrCompanies()` - 15 edges
8. `openVideo()` - 15 edges
9. `vBoard()` - 13 edges
10. `env()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `route()` --calls--> `verifyGoogleIdToken()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `route()` --calls--> `signSession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `currentUser()` --calls--> `verifySession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `hrSheets()` --calls--> `getDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/store.js
- `upsertUser()` --calls--> `createUser()`  [EXTRACTED]
  backend/src/index.js → backend/src/store.js

## Import Cycles
- None detected.

## Communities (17 total, 3 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.09
Nodes (65): audit(), callDoc(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc() (+57 more)

### Community 1 - "store.js"
Cohesion: 0.07
Nodes (42): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+34 more)

### Community 2 - "role-matrix.test.mjs"
Cohesion: 0.09
Nodes (26): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+18 more)

### Community 3 - "app.js"
Cohesion: 0.13
Nodes (19): addComment(), addSvc(), busyRow(), changeComments(), claudeStatus(), deleteComment(), dueText(), editComment() (+11 more)

### Community 4 - "mcp.js"
Cohesion: 0.15
Nodes (18): BOARD_STAGES, callTool(), date, DAYS, daySchema, handleMcp(), ids, isDoneStage() (+10 more)

### Community 5 - "h"
Cohesion: 0.23
Nodes (21): allowed(), cardExtra(), deptManager(), h(), memberIds(), moveVideo(), myTeams(), openClient() (+13 more)

### Community 6 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, get() (+8 more)

### Community 7 - "schedule"
Cohesion: 0.20
Nodes (16): exportCsv(), hrs(), loadHr(), onErr(), repRows(), route(), schedule(), schMove() (+8 more)

### Community 8 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 9 - "tryW"
Cohesion: 0.22
Nodes (14): dayLabel(), deleteEntry(), dur(), entryMeta(), myEntries(), running(), saveMine(), startTimer() (+6 more)

### Community 10 - "openVideo"
Cohesion: 0.22
Nodes (13): addStep(), fill(), fillSelects(), fillTemplateOptions(), linkRow(), openEntry(), openShoot(), openVideo() (+5 more)

### Community 11 - "vHrCompanies"
Cohesion: 0.23
Nodes (13): exportAudit(), exportHrQuickReport(), hrCanWrite(), hrCompanyModels(), hrErr(), loadProfiles(), openHrClient(), openHrConfig() (+5 more)

### Community 12 - "api.e2e.mjs"
Cohesion: 0.38
Nodes (4): call(), list(), login(), run

### Community 13 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, deploy, dev, test, test:aws

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 79 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `scripts` to `store.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08737060041407868 - nodes in this community are weakly interconnected._
- **Should `store.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07180851063829788 - nodes in this community are weakly interconnected._
- **Should `role-matrix.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0873440285204991 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13405797101449277 - nodes in this community are weakly interconnected._