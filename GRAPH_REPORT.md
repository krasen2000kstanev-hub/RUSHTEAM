# Graph Report - RUSHTEAM  (2026-10-26)

## Corpus Check
- 21 files · ~16,477 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 279 nodes · 731 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8fcbebe2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- role-matrix.test.mjs
- notify.js
- app.js
- store.js
- h
- sheets.js
- data.js
- tryW
- openVideo
- vTimer
- vReports
- preview-server.js
- renderCheck

## God Nodes (most connected - your core abstractions)
1. `h()` - 26 edges
2. `route()` - 25 edges
3. `handleDoc()` - 24 edges
4. `render()` - 16 edges
5. `schedule()` - 15 edges
6. `vHrCompanies()` - 15 edges
7. `openVideo()` - 15 edges
8. `tryW()` - 14 edges
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
- `listDepts()` --calls--> `listUsers()`  [EXTRACTED]
  backend/src/index.js → backend/src/store.js

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.10
Nodes (55): audit(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc(), handler() (+47 more)

### Community 1 - "role-matrix.test.mjs"
Cohesion: 0.08
Nodes (24): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+16 more)

### Community 2 - "notify.js"
Cohesion: 0.07
Nodes (30): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+22 more)

### Community 3 - "app.js"
Cohesion: 0.17
Nodes (19): errMsg(), exportHrQuickReport(), hrCanWrite(), hrCompanyModels(), hrErr(), loadHr(), onErr(), openHrClient() (+11 more)

### Community 4 - "store.js"
Cohesion: 0.19
Nodes (20): upsertUser(), daily(), digest(), esc(), handler(), localParts(), previousMonth(), ses (+12 more)

### Community 5 - "h"
Cohesion: 0.22
Nodes (20): allowed(), cardExtra(), deptManager(), dueText(), fillTemplateOptions(), h(), linkRow(), memberIds() (+12 more)

### Community 6 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, filled() (+8 more)

### Community 7 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 8 - "tryW"
Cohesion: 0.25
Nodes (14): addComment(), changeComments(), deleteComment(), deleteEntry(), editComment(), loadProfiles(), moveVideo(), renderComments() (+6 more)

### Community 9 - "openVideo"
Cohesion: 0.23
Nodes (13): addSvc(), eventDays(), fill(), fillSelects(), openEntry(), openShoot(), openVideo(), pairSelects() (+5 more)

### Community 10 - "vTimer"
Cohesion: 0.32
Nodes (8): dayLabel(), dur(), entryMeta(), myEntries(), running(), syncTimerBar(), tick(), vTimer()

### Community 11 - "vReports"
Cohesion: 0.38
Nodes (7): exportAudit(), exportCsv(), hrs(), repRows(), setPreset(), vReports(), weekStart()

### Community 13 - "renderCheck"
Cohesion: 1.00
Nodes (3): addStep(), renderCheck(), saveCheck()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 65 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@aws-sdk/client-sesv2` connect `notify.js` to `store.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10225988700564972 - nodes in this community are weakly interconnected._
- **Should `role-matrix.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08253968253968254 - nodes in this community are weakly interconnected._
- **Should `notify.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06854838709677419 - nodes in this community are weakly interconnected._