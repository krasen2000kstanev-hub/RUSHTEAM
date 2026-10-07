import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const table = (env) => env.TABLE_NAME;
const key = (collection, id) => ({ pk: `DOC#${collection}#${id}`, sk: 'DOC' });

export async function getDoc(env, collection, id) {
  const out = await db.send(new GetCommand({ TableName: table(env), Key: key(collection, id) }));
  if (!out.Item) return null;
  return { data: JSON.parse(out.Item.data), version: out.Item.version || 1, updatedAt: out.Item.updatedAt };
}

export async function listDocs(env, collection) {
  const out = await db.send(new QueryCommand({ TableName: table(env), IndexName: 'CollectionIndex', KeyConditionExpression: 'gsi1pk = :collection', ExpressionAttributeValues: { ':collection': `COLLECTION#${collection}` } }));
  return (out.Items || []).sort((a, b) => String(a.id).localeCompare(String(b.id))).map((item) => ({ id: item.id, data: JSON.parse(item.data) }));
}

export async function putDoc(env, collection, id, data, updatedBy, version = 1) {
  const now = new Date().toISOString();
  await db.send(new PutCommand({ TableName: table(env), Item: { ...key(collection, id), entity: 'doc', collection, id, data: JSON.stringify(data), version, updatedBy, updatedAt: now, gsi1pk: `COLLECTION#${collection}`, gsi1sk: `${now}#${id}` } }));
  return { updatedAt: now, version };
}

export async function deleteDoc(env, collection, id) { await db.send(new DeleteCommand({ TableName: table(env), Key: key(collection, id) })); }
const userKey = (id) => ({ pk: `USER#${id}`, sk: 'PROFILE' });
export async function getUser(env, id) { return (await db.send(new GetCommand({ TableName: table(env), Key: userKey(id) }))).Item || null; }
export async function findUser(env, sub, email) { const out = await db.send(new ScanCommand({ TableName: table(env), FilterExpression: 'entity = :entity AND (googleSub = :sub OR email = :email)', ExpressionAttributeValues: { ':entity': 'user', ':sub': sub, ':email': email } })); return out.Items?.[0] || null; }
export async function listUsers(env) { const out = await db.send(new ScanCommand({ TableName: table(env), FilterExpression: 'entity = :entity', ExpressionAttributeValues: { ':entity': 'user' } })); return out.Items || []; }
export async function createUser(env, user) { await db.send(new PutCommand({ TableName: table(env), Item: { ...userKey(user.id), entity: 'user', ...user } })); }
export async function updateUser(env, id, fields) {
  const names = Object.keys(fields); if (!names.length) return;
  const expression = names.map((name, i) => `#f${i} = :v${i}`).join(', ');
  const namesMap = Object.fromEntries(names.map((name, i) => [`#f${i}`, name]));
  const valuesMap = Object.fromEntries(names.map((name, i) => [`:v${i}`, fields[name]]));
  await db.send(new UpdateCommand({ TableName: table(env), Key: userKey(id), UpdateExpression: `SET ${expression}`, ExpressionAttributeNames: namesMap, ExpressionAttributeValues: valuesMap }));
}
