# Graph Report - RUSHTEAM  (2026-11-22)

## Corpus Check
- 24 files · ~22,873 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 335 nodes · 861 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `899c9dea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- rules.js
- notify.js
- auth.js
- h
- mcp.js
- app.js
- sheets.js
- tryW
- data.js
- schedule
- openVideo
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
- `toUser()` --calls--> `normalizeTeams()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `listDepts()` --calls--> `canReadDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (18 total, 3 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.13
Nodes (44): audit(), callDoc(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc() (+36 more)

### Community 1 - "rules.js"
Cohesion: 0.08
Nodes (45): ALL_TEAMS, canBeAssigned(), canReadDoc(), canReadSheets(), canWriteDoc(), canWriteSheets(), deepMerge(), docTeam() (+37 more)

### Community 2 - "notify.js"
Cohesion: 0.06
Nodes (38): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+30 more)

### Community 3 - "auth.js"
Cohesion: 0.11
Nodes (19): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+11 more)

### Community 4 - "h"
Cohesion: 0.18
Nodes (24): allowed(), cardExtra(), deptManager(), dueText(), eventDays(), h(), markTraining(), memberIds() (+16 more)

### Community 5 - "mcp.js"
Cohesion: 0.14
Nodes (19): BOARD_STAGES, callTool(), date, DAYS, daySchema, handleMcp(), ids, isDoneStage() (+11 more)

### Community 6 - "app.js"
Cohesion: 0.18
Nodes (16): busyRow(), claudeStatus(), errMsg(), exportHrQuickReport(), fillScheduleForm(), hrCanWrite(), hrCompanyModels(), hrErr() (+8 more)

### Community 7 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, get() (+8 more)

### Community 8 - "tryW"
Cohesion: 0.25
Nodes (15): addComment(), changeComments(), deleteComment(), deleteEntry(), editComment(), moveVideo(), renderComments(), saveMine() (+7 more)

### Community 9 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 10 - "schedule"
Cohesion: 0.21
Nodes (14): goalHint(), goalLevel(), loadProfiles(), onErr(), openGoal(), prevGoal(), route(), schedule() (+6 more)

### Community 11 - "openVideo"
Cohesion: 0.22
Nodes (13): addStep(), fill(), fillSelects(), fillTemplateOptions(), linkRow(), openEntry(), openShoot(), openVideo() (+5 more)

### Community 12 - "vTimer"
Cohesion: 0.32
Nodes (8): dayLabel(), dur(), entryMeta(), myEntries(), running(), syncTimerBar(), tick(), vTimer()

### Community 13 - "vReports"
Cohesion: 0.38
Nodes (7): exportAudit(), exportCsv(), hrs(), repRows(), setPreset(), vReports(), weekStart()

### Community 15 - "renderSvc"
Cohesion: 1.00
Nodes (3): addSvc(), renderSvc(), saveSvc()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 80 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 11 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12670068027210885 - nodes in this community are weakly interconnected._
- **Should `rules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08244680851063829 - nodes in this community are weakly interconnected._
- **Should `notify.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11083743842364532 - nodes in this community are weakly interconnected._
- **Should `mcp.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._