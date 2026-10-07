# Team Hub API

AWS Lambda + API Gateway + DynamoDB backend. Lambda прилага правилата за достъп и задейства SES известия след успешен запис.

## Файлове

- `src/index.js` — API Gateway Lambda handler и маршрути.
- `src/store.js` — DynamoDB документен слой.
- `src/rules.js` — правилата за достъп като чисти функции.
- `src/auth.js` — Google ID token и HMAC сесии.
- `src/sheets.js` — четене на Google таблици със service account.
- `src/notify.js` — асинхронни SES известия.
- `template.yaml` — AWS SAM stack.

## API

Всички маршрути освен `health` и `auth` искат `Authorization: Bearer <сесия>`.

- `GET /api/health`
- `POST /api/auth/google` — `{credential}` → `{token, user}`.
- `GET /api/me`
- `GET /api/users`
- `POST /api/sync` — `{queries:[{collection, where}]}`.
- `GET | PUT | PATCH | DELETE /api/doc?path=<колекция>/<id>`.
- `GET /api/sheets/:id` — първият лист като CSV в base64.

## AWS настройки

SAM parameters/environment:

| Име | Значение |
|---|---|
| `TABLE_NAME` | Създава се от SAM template-а. |
| `ALLOWED_ORIGINS` | GitHub Pages адресът и локалните адреси. |
| `GOOGLE_CLIENT_ID` | OAuth Client ID от Google Cloud. |
| `ADMIN_EMAILS` | Имейли, които стават мениджъри. |
| `HR_SHEET_IDS` | Разрешените 4 Google Sheet ID-та. |
| `SESSION_SECRET` | Дълъг случаен низ. Смяната му изкарва всички от системата. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Read-only service account JSON за таблиците. |
| `SES_FROM_EMAIL` | `noreply@sofiasummit.bg`. |
| `FRONTEND_URL` | Публичният GitHub Pages адрес. |

Не записвайте тези стойности в Git. За deploy използвайте SAM параметри или GitHub Actions secrets.

## SES и Cloudflare DNS

В SES верифицирайте `sofiasummit.bg`, добавете DKIM CNAME записите в Cloudflare DNS и поискайте production access. В sandbox SES изпраща само към потвърдени получатели.

## Локално

```bash
npm install
npm test
sam build --template-file template.yaml
sam local start-api --template template.yaml --port 8787
```

За локална API проверка задайте `ALLOW_TEST_LOGIN=1`, `TABLE_NAME` към DynamoDB Local/тестова таблица и `API=http://127.0.0.1:8787 node tests/api.e2e.mjs`.

## Deploy

```bash
sam build --template-file template.yaml
sam deploy --guided --template-file template.yaml
```

След deploy сложете SAM output `ApiUrl` в `config.js` като `apiBase`. GitHub Actions използва OIDC role от secret `AWS_ROLE_ARN` и deploy-ва `eu-central-1`.
