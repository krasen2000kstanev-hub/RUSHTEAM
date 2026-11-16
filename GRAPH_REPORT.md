# Graph Report - RUSHTEAM  (2026-11-16)

## Corpus Check
- 21 files · ~17,415 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .example 2, .toml 2)

## Summary
- 286 nodes · 757 edges · 19 communities (16 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bbe54d10`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- notify.js
- h
- app.js
- index.js
- role-matrix.test.mjs
- sheets.js
- tryW
- handleDoc
- rules.js
- data.js
- store.js
- auth.js
- vHrCompanies
- schedule
- renderCheck
- listCollection
- preview-server.js

## God Nodes (most connected - your core abstractions)
1. `h()` - 28 edges
2. `handleDoc()` - 25 edges
3. `route()` - 25 edges
4. `schedule()` - 18 edges
5. `render()` - 17 edges
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
- `toUser()` --calls--> `normalizeTeams()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (19 total, 3 thin omitted)

### Community 0 - "notify.js"
Cohesion: 0.07
Nodes (39): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+31 more)

### Community 1 - "h"
Cohesion: 0.16
Nodes (28): allowed(), cardExtra(), deptManager(), dueText(), eventDays(), fill(), fillSelects(), fillTemplateOptions() (+20 more)

### Community 2 - "app.js"
Cohesion: 0.15
Nodes (21): dayLabel(), dur(), entryMeta(), exportAudit(), exportCsv(), fillScheduleForm(), hrs(), myEntries() (+13 more)

### Community 3 - "index.js"
Cohesion: 0.17
Nodes (23): audit(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handler(), hrSheets() (+15 more)

### Community 4 - "role-matrix.test.mjs"
Cohesion: 0.09
Nodes (16): head, founder, hrClient, hrClientDoc, hrManager, hrMember, mediaClient, mediaManager (+8 more)

### Community 5 - "sheets.js"
Cohesion: 0.26
Nodes (16): accessToken(), appendSheetRow(), b64url(), b64urlText(), col(), encoder, fieldMatches, get() (+8 more)

### Community 6 - "tryW"
Cohesion: 0.21
Nodes (16): addComment(), changeComments(), deleteComment(), deleteEntry(), editComment(), errMsg(), exportHrQuickReport(), loadProfiles() (+8 more)

### Community 7 - "handleDoc"
Cohesion: 0.17
Nodes (14): handleDoc(), deepMerge(), ownersToCheck(), parsePath(), videoOwners(), videoTeam(), admin, designer (+6 more)

### Community 8 - "rules.js"
Cohesion: 0.34
Nodes (14): canBeAssigned(), canReadDoc(), canReadSheets(), canWriteDoc(), canWriteSheets(), docTeam(), docTeams(), isFounder() (+6 more)

### Community 9 - "data.js"
Cohesion: 0.28
Nodes (11): api(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut(), snapshot() (+3 more)

### Community 10 - "store.js"
Cohesion: 0.31
Nodes (12): upsertUser(), createUser(), db, deleteDoc(), findUser(), getDoc(), getUser(), key() (+4 more)

### Community 11 - "auth.js"
Cohesion: 0.40
Nodes (9): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+1 more)

### Community 12 - "vHrCompanies"
Cohesion: 0.29
Nodes (10): hrCanWrite(), hrCompanyModels(), hrErr(), openHrClient(), openHrConfig(), openHrRow(), saveHrClientMeta(), syncHrRowForm() (+2 more)

### Community 13 - "schedule"
Cohesion: 0.46
Nodes (8): loadHr(), render(), route(), schedule(), schMove(), subSchedules(), vSchedule(), vTasks()

### Community 14 - "renderCheck"
Cohesion: 0.40
Nodes (6): addStep(), addSvc(), renderCheck(), renderSvc(), saveCheck(), saveSvc()

### Community 15 - "listCollection"
Cohesion: 0.50
Nodes (5): listCollection(), listDepts(), toUser(), collectionKind(), matchesWhere()

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
  _Cohesion score 0.0664451827242525 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1476923076923077 - nodes in this community are weakly interconnected._
- **Should `role-matrix.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._