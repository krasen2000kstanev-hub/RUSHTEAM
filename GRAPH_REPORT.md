# Graph Report - repo  (2026-10-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 275 nodes · 721 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6bfb698d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Сървър: API маршрути
- Сървър: права за достъп
- Подбор (Google таблици)
- Зависимости на сървъра
- Вход и сесии
- Екрани: дъски, календар, преглед
- Имейли и отчети
- Връзка с API и опресняване
- Таймер
- Начало и отчети
- Коментари и чеклист
- Форми за записи
- API тестове
- Локален преглед
- Услуги на събития

## God Nodes (most connected - your core abstractions)
1. `route()` - 26 edges
2. `h()` - 26 edges
3. `handleDoc()` - 24 edges
4. `render()` - 16 edges
5. `openVideo()` - 15 edges
6. `schedule()` - 15 edges
7. `vHrCompanies()` - 15 edges
8. `tryW()` - 14 edges
9. `env()` - 13 edges
10. `canReadDoc()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `currentUser()` --calls--> `verifySession()`  [EXTRACTED]
  backend/src/index.js → backend/src/auth.js
- `handleDoc()` --calls--> `canBeAssigned()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `canReadDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `canWriteDoc()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js
- `handleDoc()` --calls--> `isFounder()`  [EXTRACTED]
  backend/src/index.js → backend/src/rules.js

## Import Cycles
- None detected.

## Communities (17 total, 3 thin omitted)

### Community 0 - "Сървър: API маршрути"
Cohesion: 0.12
Nodes (44): audit(), corsHeaders(), currentUser(), defaultHrSheets(), env(), eventRequest(), handleDoc(), handler() (+36 more)

### Community 1 - "Сървър: права за достъп"
Cohesion: 0.10
Nodes (34): ALL_TEAMS, canBeAssigned(), canReadDoc(), canReadSheets(), canWriteDoc(), canWriteSheets(), docTeam(), docTeams() (+26 more)

### Community 2 - "Подбор (Google таблици)"
Cohesion: 0.17
Nodes (19): b64text(), hrCanWrite(), hrCompanyModels(), hrErr(), loadHr(), onErr(), openHrClient(), openHrConfig() (+11 more)

### Community 3 - "Зависимости на сървъра"
Cohesion: 0.09
Nodes (22): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-lambda, @aws-sdk/client-sesv2, @aws-sdk/lib-dynamodb, devDependencies, wrangler, name (+14 more)

### Community 4 - "Вход и сесии"
Cohesion: 0.18
Nodes (19): base64UrlToBytes(), bytesToBase64Url(), decodePart(), encoder, googleKeys(), hmacKey(), signSession(), verifyGoogleIdToken() (+11 more)

### Community 5 - "Екрани: дъски, календар, преглед"
Cohesion: 0.22
Nodes (21): allowed(), cardExtra(), deptManager(), dueText(), eventDays(), h(), memberIds(), myTeams() (+13 more)

### Community 6 - "Имейли и отчети"
Cohesion: 0.18
Nodes (17): daily(), digest(), esc(), handler(), localParts(), previousMonth(), ses, describe() (+9 more)

### Community 7 - "Връзка с API и опресняване"
Cohesion: 0.26
Nodes (12): api(), callTool(), loadUsers(), offline(), onCredential(), setToken(), showLogin(), signOut() (+4 more)

### Community 8 - "Таймер"
Cohesion: 0.24
Nodes (12): dayLabel(), deleteEntry(), dur(), entryMeta(), myEntries(), running(), startTimer(), stopTimer() (+4 more)

### Community 9 - "Начало и отчети"
Cohesion: 0.23
Nodes (12): exportAudit(), exportCsv(), exportHrQuickReport(), hrs(), loadProfiles(), moveVideo(), repRows(), setPreset() (+4 more)

### Community 10 - "Коментари и чеклист"
Cohesion: 0.29
Nodes (10): addComment(), addStep(), changeComments(), deleteComment(), editComment(), errMsg(), renderCheck(), renderComments() (+2 more)

### Community 11 - "Форми за записи"
Cohesion: 0.29
Nodes (10): fill(), fillSelects(), fillTemplateOptions(), linkRow(), openEntry(), openShoot(), openVideo(), pairSelects() (+2 more)

### Community 12 - "API тестове"
Cohesion: 0.32
Nodes (4): call(), list(), login(), run

### Community 14 - "Услуги на събития"
Cohesion: 1.00
Nodes (3): addSvc(), renderSvc(), saveSvc()

## Knowledge Gaps
- **1 isolated node(s):** `wrangler`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 64 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@aws-sdk/client-sesv2` connect `Зависимости на сървъра` to `Имейли и отчети`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `render()` (e.g. with `vBoard()` and `vCal()`) actually correct?**
  _`render()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `wrangler` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Сървър: API маршрути` be split into smaller, more focused modules?**
  _Cohesion score 0.12159863945578231 - nodes in this community are weakly interconnected._
- **Should `Сървър: права за достъп` be split into smaller, more focused modules?**
  _Cohesion score 0.09957325746799431 - nodes in this community are weakly interconnected._
- **Should `Зависимости на сървъра` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._