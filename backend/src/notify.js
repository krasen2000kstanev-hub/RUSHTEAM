import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { listUsers } from './store.js';

const lambda = new LambdaClient({});
const ses = new SESv2Client({});

export async function enqueueNotification(env, event) {
  if (!env.NOTIFIER_FUNCTION_NAME) return;
  await lambda.send(new InvokeCommand({ FunctionName: env.NOTIFIER_FUNCTION_NAME, InvocationType: 'Event', Payload: Buffer.from(JSON.stringify(event)) }));
}

const idsForChange = (event) => {
  const ids = new Set(); const data = event.newData || event.oldData || {};
  if (event.collection === 'time') ids.add(event.owner);
  if (data.who) ids.add(data.who);
  if (Array.isArray(data.helpers)) data.helpers.forEach((id) => ids.add(id));
  if (Array.isArray(data.crew)) data.crew.forEach((id) => ids.add(id));
  if (event.collection === 'members' || event.collection === 'depts') ids.add(event.id);
  return ids;
};

const KIND = { media: 'видео', web: 'сайт', events: 'събитие', design: 'дизайн задача' };
const WHAT = { tasks: 'споделена задача', shoots: 'снимачен ден', clients: 'клиент', hrclients: 'клиент (подбор)', members: 'права', depts: 'права', time: 'време' };
const VERB = { created: 'създаде', updated: 'промени', deleted: 'изтри' };

// Човешки текст за имейла: „Красен приключи събитие „ДСК ОБУЧЕНИЕ““ вместо „updated videos/a8F3…“.
export function describe(event, url = '') {
  const data = event.newData || event.oldData || {};
  const what = event.collection === 'videos' ? KIND[data.team] || 'задача' : WHAT[event.collection] || event.collection;
  const finished = event.action === 'updated' && ((event.newData?.doneAt && !event.oldData?.doneAt) || (event.newData?.done && !event.oldData?.done));
  const verb = finished ? 'приключи' : VERB[event.action] || event.action;
  const title = data.title || data.name || data.company || '';
  const line = `${event.actorName || 'Системата'} ${verb} ${what}${title ? ` „${title}“` : ''}`;
  return { subject: `Team Hub: ${line}`, body: [line + '.', url && `Отвори: ${url}`].filter(Boolean).join('\n\n') };
}

export async function handler(event) {
  const env = process.env; const users = await listUsers(env); const affected = idsForChange(event);
  const managers = users.filter((user) => user.active && user.role === 'admin').map((user) => user.id);
  const recipients = [...new Set(users.filter((user) => user.active && user.email && [...affected, ...managers].includes(user.id)).map((user) => user.email))];
  if (!recipients.length || !env.SES_FROM_EMAIL) return { skipped: true };
  const { subject, body } = describe(event, env.FRONTEND_URL);
  await ses.send(new SendEmailCommand({ FromEmailAddress: env.SES_FROM_EMAIL, Destination: { ToAddresses: recipients }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: body, Charset: 'UTF-8' } } } } }));
  return { sent: recipients.length };
}
