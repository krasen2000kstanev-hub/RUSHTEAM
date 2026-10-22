# Graph Report - RUSHTEAM  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 269 nodes · 699 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c7eb632`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- rules.js
- package.json
- h
- sheets.js
- app.js
- schedule
- data.js
- vTimer
- tryW
- api.e2e.mjs
- preview-server.js
- monthly.js
- fill
- renderSvc

## God Nodes (most connected - your core abstractions)
1. `route()` - 26 edges
2. `h()` - 26 edges
3. `handleDoc()` - 24 edges
4. `render()` - 16 edges
5. `openVideo()` - 15 edges
6. `vHrCompanies()` - 15 edges
7. `schedule()` - 15 edges
8. `env()` - 13 edges
9. `canReadDoc()` - 13 edges
10. `vBoard()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `currentUser()` --calls--> `verifySession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `handleDoc()` --calls--> `canBeAssigned()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `canReadDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `canWriteDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `deepMerge()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.13
Nodes (44): audit(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc(), handler() (+36 more)

### Community 1 - "rules.js"
Cohesion: 0.10
Nodes (35): ALL_TEAMS, canBeAssigned(), canReadDoc(), canReadSheets(), canWriteDoc(), canWriteSheets(), deepMerge(), docTeam() (+27 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (26): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+18 more)

### Community 3 - "h"
Cohesion: 0.21
Nodes (22): allowed(), deptManager(), dueText(), fillTemplateOptions(), h(), linkRow(), memberIds(), myTeams() (+14 more)

### Community 4 - "sheets.js"
Cohesion: 0.18
Nodes (19): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+11 more)

### Community 5 - "app.js"
Cohesion: 0.19
Nodes (16): b64text(), cardExtra(), hrCanWrite(), hrCompanyModels(), hrErr(), loadHr(), openHrClient(), openHrConfig() (+8 more)

### Community 6 - "schedule"
Cohesion: 0.16
Nodes (18): exportAudit(), exportCsv(), exportHrQuickReport(), hrs(), loadProfiles(), moveVideo(), onErr(), repRows() (+10 more)

### Community 7 - "data.js"
Cohesion: 0.26
Nodes (12): api(), callTool(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut() (+4 more)

### Community 8 - "vTimer"
Cohesion: 0.24
Nodes (12): dayLabel(), deleteEntry(), dur(), entryMeta(), myEntries(), running(), startTimer(), stopTimer() (+4 more)

### Community 9 - "tryW"
Cohesion: 0.29
Nodes (10): addComment(), addStep(), changeComments(), deleteComment(), editComment(), errMsg(), renderCheck(), renderComments() (+2 more)

### Community 10 - "api.e2e.mjs"
Cohesion: 0.32
Nodes (4): call(), list(), login(), run

### Community 11 - "preview-server.js"
Cohesion: 0.25
Nodes (4): fs, http, path, types

### Community 12 - "monthly.js"
Cohesion: 0.48
Nodes (6): esc(), handler(), localParts(), previousMonth(), ses, listDocs()

### Community 13 - "fill"
Cohesion: 0.60
Nodes (5): fill(), fillSelects(), openEntry(), openShoot(), pairSelects()

### Community 14 - "renderSvc"
Cohesion: 1.00
Nodes (3): addSvc(), renderSvc(), saveSvc()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 63 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@aws-sdk/client-sesv2` connect `package.json` to `monthly.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12943262411347517 - nodes in this community are weakly interconnected._
- **Why does `@aws-sdk/client-dynamodb` connect `package.json` to `index.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `rules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09716599190283401 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._