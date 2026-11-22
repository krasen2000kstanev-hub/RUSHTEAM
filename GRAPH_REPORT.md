# Graph Report - RUSHTEAM  (2026-11-22)

## Corpus Check
- 24 files · ~22,304 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 334 nodes · 860 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21e88295`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- role-matrix.test.mjs
- h
- rules.js
- package.json
- mcp.js
- app.js
- notify.js
- sheets.js
- tryW
- data.js
- schedule
- store.js
- rules.test.mjs
- openVideo
- auth.js
- vTimer
- vReports
- preview-server.js
- renderSvc

## God Nodes (most connected - your core abstractions)
1. `h()` - 31 edges
2. `route()` - 30 edges
3. `handleDoc()` - 27 edges
4. `schedule()` - 19 edges
5. `render()` - 18 edges
6. `tryW()` - 16 edges
7. `vHrCompanies()` - 15 edges
8. `openVideo()` - 15 edges
9. `canWriteDoc()` - 14 edges
10. `myTeams()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `route()` --calls--> `verifyGoogleIdToken()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `route()` --calls--> `signSession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `currentUser()` --calls--> `verifySession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `hrSheets()` --calls--> `getDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/store.js
- `toUser()` --calls--> `normalizeTeams()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.17
Nodes (29): audit(), callDoc(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc() (+21 more)

### Community 1 - "role-matrix.test.mjs"
Cohesion: 0.08
Nodes (21): audits, docs, req(), rpc(), users, head, founder, hrClient (+13 more)

### Community 2 - "h"
Cohesion: 0.18
Nodes (24): allowed(), cardExtra(), deptManager(), dueText(), eventDays(), h(), markTraining(), memberIds() (+16 more)

### Community 3 - "rules.js"
Cohesion: 0.19
Nodes (23): ALL_TEAMS, canBeAssigned(), canReadDoc(), canReadSheets(), canWriteDoc(), canWriteSheets(), docTeam(), docTeams() (+15 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+13 more)

### Community 5 - "mcp.js"
Cohesion: 0.15
Nodes (18): BOARD_STAGES, callTool(), date, DAYS, daySchema, handleMcp(), ids, isDoneStage() (+10 more)

### Community 6 - "app.js"
Cohesion: 0.18
Nodes (16): busyRow(), claudeStatus(), errMsg(), exportHrQuickReport(), fillScheduleForm(), hrCanWrite(), hrCompanyModels(), hrErr() (+8 more)

### Community 7 - "notify.js"
Cohesion: 0.18
Nodes (18): daily(), digest(), esc(), handler(), localParts(), previousMonth(), ses, describe() (+10 more)

### Community 8 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, get() (+8 more)

### Community 9 - "tryW"
Cohesion: 0.25
Nodes (15): addComment(), changeComments(), deleteComment(), deleteEntry(), editComment(), moveVideo(), renderComments(), saveMine() (+7 more)

### Community 10 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 11 - "schedule"
Cohesion: 0.21
Nodes (14): goalHint(), goalLevel(), loadProfiles(), onErr(), openGoal(), prevGoal(), route(), schedule() (+6 more)

### Community 12 - "store.js"
Cohesion: 0.31
Nodes (12): upsertUser(), createUser(), db, deleteDoc(), findUser(), getDoc(), getUser(), key() (+4 more)

### Community 13 - "rules.test.mjs"
Cohesion: 0.15
Nodes (13): deepMerge(), ownersToCheck(), parsePath(), videoOwners(), videoTeam(), admin, designer, editor (+5 more)

### Community 14 - "openVideo"
Cohesion: 0.22
Nodes (13): addStep(), fill(), fillSelects(), fillTemplateOptions(), linkRow(), openEntry(), openShoot(), openVideo() (+5 more)

### Community 15 - "auth.js"
Cohesion: 0.40
Nodes (9): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+1 more)

### Community 16 - "vTimer"
Cohesion: 0.32
Nodes (8): dayLabel(), dur(), entryMeta(), myEntries(), running(), syncTimerBar(), tick(), vTimer()

### Community 17 - "vReports"
Cohesion: 0.38
Nodes (7): exportAudit(), exportCsv(), hrs(), repRows(), setPreset(), vReports(), weekStart()

### Community 19 - "renderSvc"
Cohesion: 1.00
Nodes (3): addSvc(), renderSvc(), saveSvc()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 79 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@aws-sdk/client-sesv2` connect `notify.js` to `package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `role-matrix.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07816091954022988 - nodes in this community are weakly interconnected._
- **Why does `@aws-sdk/client-lambda` connect `package.json` to `notify.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `mcp.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1471861471861472 - nodes in this community are weakly interconnected._