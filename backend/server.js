import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { addSubscription, sendPushToAll } from './push.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const STORAGE_DIR = path.join(__dirname, 'storage');
const ENTRIES_FILE = path.join(STORAGE_DIR, 'entries.json');

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(ENTRIES_FILE)) fs.writeFileSync(ENTRIES_FILE, '[]', 'utf8');

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

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.post('/api/entries', async (req, res) => {
  try {
    const { entries } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, error: 'entries debe ser un array con objetos' });
    }
    const stored = await readJson(ENTRIES_FILE);
    const merged = stored.concat(
      entries.map(e => ({
        id: e.id,
        text: e.text,
        createdAt: e.createdAt || Date.now(),
        syncedAt: Date.now(),
      }))
    );
    await writeJson(ENTRIES_FILE, merged);

    const syncedIds = entries.map(e => e.id).filter(id => id != null);

    try {
      await sendPushToAll({
        title: 'GlowUp',
        body: 'Tus notas pendientes se sincronizaron 📝✨',
        url: '/',
      });
    } catch (err) {
      console.warn('[push] no se pudo enviar notificación:', err?.message || err);
    }

    return res.json({ ok: true, syncedIds });
  } catch (err) {
    console.error('[POST /api/entries] error', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

app.post('/api/subscribe', async (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ ok: false, error: 'suscripción inválida' });
    }
    const r = await addSubscription(sub);
    res.status(201).json({ ok: true, total: r.total });
  } catch (err) {
    console.error('[POST /api/subscribe] error', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

app.post('/api/push-test', async (req, res) => {
  try {
    const payload = {
      title: req.body?.title || 'GlowUp',
      body: req.body?.body || 'Notificación de prueba ✨',
      url: req.body?.url || '/',
    };
    const result = await sendPushToAll(payload);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[POST /api/push-test] error', err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'glowup-backend', time: Date.now() });
});

app.listen(PORT, () => {
  console.log(`✅ Backend listo en http://localhost:${PORT}`);
  console.log(`CORS_ORIGIN: ${CORS_ORIGIN}`);
});
