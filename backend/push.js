import webpush from 'web-push';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BL9pUDt94-xK-YXD_ygpRz0Gk97bQ6pXbygS_VwuW_9IOf-MTrAT2Y7eSfoFjaUvFGI-Ng-WpuwcErUOT_brhJE';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'puufNgxFRvam30VielMxG17Z9Q11O8YsSDCf715UOxc';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:tu-correo@example.com';

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.warn('[push] ⚠️ VAPID no configuradas. Push fallará hasta añadir VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.');
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const STORAGE_DIR = path.join(__dirname, 'storage');
const SUBS_FILE = path.join(STORAGE_DIR, 'subscriptions.json');

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(SUBS_FILE)) fs.writeFileSync(SUBS_FILE, '[]', 'utf8');

async function readJson(file) {
  try {
    const txt = await fsp.readFile(file, 'utf8');
    return JSON.parse(txt || '[]');
  } catch {
    return [];
  }
}
async function writeJson(file, data) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function addSubscription(sub) {
  const list = await readJson(SUBS_FILE);
  if (!list.find(s => s.endpoint === sub.endpoint)) {
    list.push(sub);
    await writeJson(SUBS_FILE, list);
  }
  return { ok: true, total: list.length };
}

export async function sendPushToAll(payloadObj) {
  const list = await readJson(SUBS_FILE);
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: 'no_subscribers', sent: 0, kept: 0 };
  }

  const payload = JSON.stringify(payloadObj);
  const alive = [];

  for (const s of list) {
    try {
      await webpush.sendNotification(s, payload);
      alive.push(s);
    } catch (err) {
      if (!(err?.statusCode === 404 || err?.statusCode === 410)) {
        console.error('[push] error enviando', err?.statusCode, err?.body || err?.message);
        alive.push(s);
      }
    }
  }

  await writeJson(SUBS_FILE, alive);
  return { ok: true, sent: list.length, kept: alive.length };
}
