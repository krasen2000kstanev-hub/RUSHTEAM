import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const table = (env) => env.TABLE_NAME;
const key = (collection, id) => ({ pk: `DOC#${collection}#${id}`, sk: 'DOC' });
// DynamoDB връща до 1 MB на заявка; без страниране хора и записи изчезват, щом таблицата порасне.
async function all(Command, input) {
  const items = []; let ExclusiveStartKey;
  do { const out = await db.send(new Command({ ...input, ExclusiveStartKey })); items.push(...(out.Items || [])); ExclusiveStartKey = out.LastEvaluatedKey; } while (ExclusiveStartKey);
  return items;
}

export async function getDoc(env, collection, id) {
  const out = await db.send(new GetCommand({ TableName: table(env), Key: key(collection, id) }));
  if (!out.Item) return null;
  return { data: JSON.parse(out.Item.data), version: out.Item.version || 1, updatedAt: out.Item.updatedAt };
}

export async function listDocs(env, collection) {
  const items = await all(QueryCommand, { TableName: table(env), IndexName: 'CollectionIndex', KeyConditionExpression: 'gsi1pk = :collection', ExpressionAttributeValues: { ':collection': `COLLECTION#${collection}` } });
  return items.sort((a, b) => String(a.id).localeCompare(String(b.id))).map((item) => ({ id: item.id, data: JSON.parse(item.data) }));
}

export async function putDoc(env, collection, id, data, updatedBy, version = 1) {
  const now = new Date().toISOString();
  const previousVersion = Math.max(0, Number(version) - 1);
  try {
    await db.send(new PutCommand({
      TableName: table(env),
      Item: { ...key(collection, id), entity: 'doc', collection, id, data: JSON.stringify(data), version, updatedBy, updatedAt: now, gsi1pk: `COLLECTION#${collection}`, gsi1sk: `${now}#${id}` },
      ConditionExpression: 'attribute_not_exists(#pk) OR #version = :previousVersion',
      ExpressionAttributeNames: { '#pk': 'pk', '#version': 'version' },
      ExpressionAttributeValues: { ':previousVersion': previousVersion },
    }));
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') error.code = 'conflict';
    throw error;
  }
  return { updatedAt: now, version };
}

export async function deleteDoc(env, collection, id) { await db.send(new DeleteCommand({ TableName: table(env), Key: key(collection, id) })); }
const userKey = (id) => ({ pk: `USER#${id}`, sk: 'PROFILE' });
export async function getUser(env, id) { return (await db.send(new GetCommand({ TableName: table(env), Key: userKey(id) }))).Item || null; }
export async function findUser(env, sub, email) { return (await all(ScanCommand, { TableName: table(env), FilterExpression: 'entity = :entity AND (googleSub = :sub OR email = :email)', ExpressionAttributeValues: { ':entity': 'user', ':sub': sub, ':email': email } }))[0] || null; }
// ponytail: списъкът с хора е Scan на цялата таблица и се иска 2 пъти на всяко опресняване (15 сек. × всеки колега).
// Кеш 10 сек. в паметта на Lambda; изчиства се при запис на потребител. Ако таблицата стане голяма – GSI за потребителите.
let usersCache = null;
export async function listUsers(env) {
  if (!usersCache || usersCache.at < Date.now() - 10000) usersCache = { at: Date.now(), items: all(ScanCommand, { TableName: table(env), FilterExpression: 'entity = :entity', ExpressionAttributeValues: { ':entity': 'user' } }) };
  try { return await usersCache.items; } catch (error) { usersCache = null; throw error; }
}

// История на действията: отделна таблица без срок на изтриване (пази се без ограничение, т.е. и над 2 години).
// Ключ по месец, за да се чете месец по месец без Scan.
export async function putAudit(env, entry) {
  if (!env.AUDIT_TABLE) return;
  const at = new Date().toISOString();
  await db.send(new PutCommand({ TableName: env.AUDIT_TABLE, Item: { pk: `AUDIT#${at.slice(0, 7)}`, sk: `${at}#${crypto.randomUUID().slice(0, 8)}`, at, ...entry } }));
}
export async function listAudit(env, month) {
  if (!env.AUDIT_TABLE) return [];
  return all(QueryCommand, { TableName: env.AUDIT_TABLE, KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `AUDIT#${month}` } });
}
export async function createUser(env, user) { usersCache = null; await db.send(new PutCommand({ TableName: table(env), Item: { ...userKey(user.id), entity: 'user', ...user } })); }
export async function updateUser(env, id, fields) {
  const names = Object.keys(fields); if (!names.length) return;
  const expression = names.map((name, i) => `#f${i} = :v${i}`).join(', ');
  const namesMap = Object.fromEntries(names.map((name, i) => [`#f${i}`, name]));
  const valuesMap = Object.fromEntries(names.map((name, i) => [`:v${i}`, fields[name]]));
  usersCache = null;
  await db.send(new UpdateCommand({ TableName: table(env), Key: userKey(id), UpdateExpression: `SET ${expression}`, ExpressionAttributeNames: namesMap, ExpressionAttributeValues: valuesMap }));
}
