# Team Hub

Вътрешна платформа за екипите: видео, сайтове, събития, дизайн и подбор. Дъски по етапи, общ преглед кой докъде е, календар, таймер и отчети. Всеки вижда само екипите, до които мениджър му е дал достъп.

Текущо състояние и оставащи стъпки: [PROJECT_MEMORY.md](PROJECT_MEMORY.md).

## Структура

Същата архитектура като `sofiasummitcenter`: статичен сайт в GitHub Pages и AWS serverless backend.

- `index.html`, `styles.css`, `app.js` — страницата. Няма стъпка за build и няма зависимости.
- `config.js` — публичните настройки: API Gateway URL, Google Client ID, ID-та на таблиците за подбор.
- `data.js` — вход с Google и връзка с API-то. `app.js` говори само с него.
- `backend/` — AWS Lambda + API Gateway + DynamoDB: вход, роли, екипи и всички данни. Подробности в [`backend/README.md`](backend/README.md).
- `.github/workflows/deploy-worker.yml` — при push към `main` с промени в `backend/` пуска тестовете и deploy-ва SAM stack-а.
- `preview-server.js` — локален преглед на сайта.

## Как работи достъпът

- Входът е с Google акаунт. Worker-ът проверява подписа на Google и издава собствена сесия за 30 дни.
- Имейлите в `ADMIN_EMAILS` (`backend/wrangler.toml`) стават мениджъри при първия си вход.
- Всеки друг влиза без екип и не вижда нищо, докато мениджър не му сложи отметка в „Екип и клиенти“.
- Правилата се прилагат на сървъра, не в страницата: задача на екип „Сайтове“ изобщо не се изпраща на човек без този екип; времето на всеки е лично и го вижда само мениджър; клиентите се редактират само от мениджър; таблиците на подбора се четат само от екип „Подбор“.

## Данни

- Задачи, клиенти, снимачни дни, време и роли живеят в DynamoDB.
- Раздел „Подбор“ не пази данни: чете Google таблиците през сервизен акаунт и се обновява на всеки 5 минути (или с „Обнови“). Промените се правят в таблиците.
- Файлове не се качват никъде. Към задачите се добавят само линкове.
- **История на действията:** всяка промяна, вход и смяна на права се записва в отделната таблица `AuditTable` (кой, кога, кой запис, кои полета преди/след). Записите нямат срок на изтриване, таблицата е с `DeletionPolicy: Retain` и PITR. Основателите я свалят като CSV от „Отчети“ → „История на действията“.

## Ръчно качване на бекенда

Обикновено бекендът се качва сам при push към `main` (GitHub Actions). Ако се наложи ръчно, от компютъра: Параметрите (тайните) се пазят със старите стойности:

```powershell
cd backend; sam build --template-file template.yaml
sam package --template-file .aws-sam/build/template.yaml --resolve-s3 --region eu-central-1 --output-template-file $env:TEMP\th.yaml
$p = 'SesFromEmail','AllowedOrigins','ReportRecipients','GoogleServiceAccountJson','GoogleClientId','HrSheetIds','SessionSecret','HourlyRatesJson','FrontendUrl','AdminEmails' | % { "ParameterKey=$_,UsePreviousValue=true" }
aws cloudformation create-change-set --stack-name team-hub --region eu-central-1 --change-set-name manual-$(Get-Date -f yyyyMMddHHmm) --template-body file://$env:TEMP\th.yaml --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --parameters $p
```

Прегледайте change set-а в AWS конзолата (никакво `Replacement: True` за таблиците) и го изпълнете.

## Пускане за първи път

1. **GitHub Pages:** Settings → Pages → Deploy from a branch → `main`, папка `/ (root)`.
2. **AWS:** инсталирайте AWS CLI и SAM CLI, изберете `eu-central-1` и изпълнете `cd backend && npm install && sam build`.
3. **SAM deploy:** копирайте `backend/samconfig.toml.example`, попълнете параметрите и изпълнете `sam deploy --guided`.
4. **Google Cloud:** създайте OAuth Client ID тип „Web application“ и добавете адреса на сайта в „Authorized JavaScript origins“. Сложете Client ID в `config.js` и SAM параметъра `GoogleClientId`.
5. **Таблиците на подбора:** споделете четирите таблици с имейла на сервизния акаунт с право „Viewer“.
6. **SES:** верифицирайте `sofiasummit.bg` чрез DKIM записите в Cloudflare DNS и поискайте production access за `noreply@sofiasummit.bg`.
7. **Адреси:** сложете изхода `ApiUrl` от SAM в `config.js` като `apiBase`.
8. **GitHub Actions:** добавете OIDC role в `AWS_ROLE_ARN` и параметрите като Actions secrets; push към `main` deploy-ва SAM stack-а.

## Локален преглед

```bash
cd backend && npm install
npm run migrate:local      # локална база
npm run dev                # API на http://127.0.0.1:8787 (тестова конфигурация)
node ../preview-server.js  # сайт на http://127.0.0.1:8765
```

Локално `config.js` сочи към продукцията. За API тестове използвайте `sam local start-api --template backend/template.yaml --port 8787` и задайте `apiBase` на `http://127.0.0.1:8787`. Тестовият вход работи само с `ALLOW_TEST_LOGIN=1` и адреси `@example.test`.

## Тестове

```bash
cd backend
npm test                   # правила за достъп, сесии, CSV (без мрежа)
sam local start-api --template template.yaml --port 8787
API=http://127.0.0.1:8787 node tests/api.e2e.mjs
```
