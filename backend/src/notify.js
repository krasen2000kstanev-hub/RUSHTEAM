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
  if (Array.isArray(data.crew)) data.crew.forEach((id) => ids.add(id));
  if (event.collection === 'members' || event.collection === 'depts') ids.add(event.id);
  return ids;
};

export async function handler(event) {
  const env = process.env; const users = await listUsers(env); const affected = idsForChange(event);
  const managers = users.filter((user) => user.active && user.role === 'admin').map((user) => user.id);
  const recipients = [...new Set(users.filter((user) => user.active && user.email && [...affected, ...managers].includes(user.id)).map((user) => user.email))];
  if (!recipients.length || !env.SES_FROM_EMAIL) return { skipped: true };
  const subject = `Team Hub: ${event.action} ${event.collection}/${event.id}`;
  const body = ['Има промяна в Team Hub.', `Действие: ${event.action}`, `Обект: ${event.collection}/${event.id}`, `Извършил: ${event.actorName || event.actor || 'системата'}`, `Отвори: ${env.FRONTEND_URL || ''}`].join('\n');
  await ses.send(new SendEmailCommand({ FromEmailAddress: env.SES_FROM_EMAIL, Destination: { ToAddresses: recipients }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: body, Charset: 'UTF-8' } } } } }));
  return { sent: recipients.length };
}
