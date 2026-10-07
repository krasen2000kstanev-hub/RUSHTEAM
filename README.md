# Team Hub

Вътрешна платформа за екипите: видео, сайтове, събития, дизайн и подбор. Дъски по етапи, общ преглед кой докъде е, календар, таймер и отчети. Всеки вижда само екипите, до които мениджър му е дал достъп.

Текущо състояние и оставащи стъпки: [PROJECT_MEMORY.md](PROJECT_MEMORY.md).

## Структура

Същата архитектура като `sofiasummitcenter`: статичен сайт в GitHub Pages и Cloudflare Worker с база D1.

- `index.html`, `styles.css`, `app.js` — страницата. Няма стъпка за build и няма зависимости.
- `config.js` — публичните настройки: адрес на API-то, Google Client ID, ID-та на таблиците за подбор.
- `data.js` — вход с Google и връзка с API-то. `app.js` говори само с него.
- `backend/` — Cloudflare Worker + D1: вход, роли, екипи и всички данни. Подробности в [`backend/README.md`](backend/README.md).
- `.github/workflows/deploy-worker.yml` — при push към `main` с промени в `backend/` пуска тестовете, прилага миграциите и deploy-ва Worker-а.
- `preview-server.js` — локален преглед на сайта.

## Как работи достъпът

- Входът е с Google акаунт. Worker-ът проверява подписа на Google и издава собствена сесия за 30 дни.
- Имейлите в `ADMIN_EMAILS` (`backend/wrangler.toml`) стават мениджъри при първия си вход.
- Всеки друг влиза без екип и не вижда нищо, докато мениджър не му сложи отметка в „Екип и клиенти“.
- Правилата се прилагат на сървъра, не в страницата: задача на екип „Сайтове“ изобщо не се изпраща на човек без този екип; времето на всеки е лично и го вижда само мениджър; клиентите се редактират само от мениджър; таблиците на подбора се четат само от екип „Подбор“.

## Данни

- Задачи, клиенти, снимачни дни, време и роли живеят в D1.
- Раздел „Подбор“ не пази данни: чете четири Google таблици през сервизен акаунт и се обновява всяка минута. Промените се правят в таблиците.
- Файлове не се качват никъде. Към задачите се добавят само линкове.

## Пускане за първи път

1. **GitHub Pages:** Settings → Pages → Deploy from a branch → `main`, папка `/ (root)`.
2. **Cloudflare D1:** `cd backend && npm install && npx wrangler d1 create team-hub`, после сложете върнатия `database_id` в `backend/wrangler.toml`.
3. **Google Cloud:** създайте OAuth Client ID тип „Web application“ и добавете адреса на сайта в „Authorized JavaScript origins“. Сложете Client ID в `config.js` и в `backend/wrangler.toml` (`GOOGLE_CLIENT_ID`).
4. **Тайни в Cloudflare:** `npx wrangler secret put SESSION_SECRET` (дълъг случаен низ) и `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON` (ключът на сервизния акаунт за таблиците).
5. **Таблиците на подбора:** споделете четирите таблици с имейла на сервизния акаунт с право „Viewer“.
6. **Тайни в GitHub:** `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions).
7. **Адреси:** проверете `apiBase` в `config.js` и `ALLOWED_ORIGINS` в `backend/wrangler.toml`.
8. Push към `main`. Workflow-ът прилага миграциите и deploy-ва Worker-а; Pages публикува сайта.

## Локален преглед

```bash
cd backend && npm install
npm run migrate:local      # локална база
npm run dev                # API на http://127.0.0.1:8787 (тестова конфигурация)
node ../preview-server.js  # сайт на http://127.0.0.1:8765
```

Локално `config.js` сочи към продукцията. За тест срещу локалния Worker сменете временно `apiBase` на `http://127.0.0.1:8787` и влезте от конзолата на браузъра с `__teamHubTestLogin("admin@example.test", "Име")`. Този вход работи само с `wrangler.test.toml` и само за адреси `@example.test`.

## Тестове

```bash
cd backend
npm test                   # правила за достъп, сесии, CSV (без мрежа)
node tests/api.e2e.mjs     # същите правила през HTTP срещу `npm run dev`
```
