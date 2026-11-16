# Graph Report - RUSHTEAM  (2026-11-16)

## Corpus Check
- 21 files · ~17,985 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 296 nodes · 780 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `01b6bbff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notify.js
- index.js
- rules.js
- app.js
- h
- role-matrix.test.mjs
- sheets.js
- store.js
- data.js
- schedule
- vHrCompanies
- auth.js
- openVideo
- handleDoc
- vReports
- preview-server.js
- renderCheck
- renderSvc

## God Nodes (most connected - your core abstractions)
1. `h()` - 29 edges
2. `handleDoc()` - 25 edges
3. `route()` - 25 edges
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
- `toUser()` --calls--> `normalizeTeams()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (20 total, 3 thin omitted)

### Community 0 - "notify.js"
Cohesion: 0.06
Nodes (38): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+30 more)

### Community 1 - "index.js"
Cohesion: 0.17
Nodes (26): audit(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handler(), hrSheets() (+18 more)

### Community 2 - "rules.js"
Cohesion: 0.14
Nodes (26): canBeAssigned(), canReadDoc(), canWriteDoc(), docTeam(), docTeams(), isManager(), manages(), normalizeTeams() (+18 more)

### Community 3 - "app.js"
Cohesion: 0.16
Nodes (22): addComment(), changeComments(), dayLabel(), deleteComment(), deleteEntry(), deptManager(), dueText(), dur() (+14 more)

### Community 4 - "h"
Cohesion: 0.19
Nodes (24): allowed(), busyRow(), cardExtra(), eventDays(), fillScheduleForm(), h(), memberIds(), moveVideo() (+16 more)

### Community 5 - "role-matrix.test.mjs"
Cohesion: 0.09
Nodes (16): head, founder, hrClient, hrClientDoc, hrManager, hrMember, mediaClient, mediaManager (+8 more)

### Community 6 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, get() (+8 more)

### Community 7 - "store.js"
Cohesion: 0.29
Nodes (13): upsertUser(), createUser(), db, deleteDoc(), findUser(), getDoc(), getUser(), key() (+5 more)

### Community 8 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 9 - "schedule"
Cohesion: 0.21
Nodes (14): goalHint(), goalLevel(), loadHr(), onErr(), openGoal(), prevGoal(), route(), schedule() (+6 more)

### Community 10 - "vHrCompanies"
Cohesion: 0.23
Nodes (13): exportAudit(), exportHrQuickReport(), hrCanWrite(), hrCompanyModels(), hrErr(), loadProfiles(), openHrClient(), openHrConfig() (+5 more)

### Community 11 - "auth.js"
Cohesion: 0.40
Nodes (9): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+1 more)

### Community 12 - "openVideo"
Cohesion: 0.29
Nodes (10): fill(), fillSelects(), fillTemplateOptions(), linkRow(), openEntry(), openShoot(), openVideo(), pairSelects() (+2 more)

### Community 13 - "handleDoc"
Cohesion: 0.32
Nodes (8): handleDoc(), notify(), plainObject(), writeDepts(), enqueueNotification(), deepMerge(), ownersToCheck(), videoTeam()

### Community 14 - "vReports"
Cohesion: 0.47
Nodes (6): exportCsv(), hrs(), repRows(), setPreset(), vReports(), weekStart()

### Community 16 - "renderCheck"
Cohesion: 1.00
Nodes (3): addStep(), renderCheck(), saveCheck()

### Community 17 - "renderSvc"
Cohesion: 1.00
Nodes (3): addSvc(), renderSvc(), saveSvc()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 66 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 10 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `notify.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `rules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `role-matrix.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._