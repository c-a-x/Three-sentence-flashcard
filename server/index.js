import express from 'express';
import cors from 'cors';
import { existsSync, promises as fs } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'cards.db');
const legacyJsonFile = path.join(dataDir, 'cards.json');
const port = Number(process.env.PORT ?? 3001);

const seedCards = [
  {
    id: 'seed-1',
    title: '第一次把问题说清楚',
    sentence1: '今天在讨论需求时，我先把用户场景写成了三句话。',
    sentence2: '这样一来，团队很快就看懂了真正要解决的问题。',
    sentence3: '以后遇到模糊需求，先把它压缩成最短的表达。',
    tags: ['需求', '复盘', '表达'],
    sourceType: '工作',
    importance: 5,
    createdAt: '2026-05-15T08:30:00.000Z',
    updatedAt: '2026-05-15T08:30:00.000Z',
  },
  {
    id: 'seed-2',
    title: '把焦虑拆成动作',
    sentence1: '晚上情绪很乱的时候，我没有继续刷手机。',
    sentence2: '我把焦虑拆成了“先洗澡，再整理桌面，再写下明天的第一步”。',
    sentence3: '小动作一旦开始，情绪就没那么难处理了。',
    tags: ['情绪', '习惯', '生活'],
    sourceType: '情绪',
    importance: 4,
    createdAt: '2026-05-14T20:10:00.000Z',
    updatedAt: '2026-05-14T20:10:00.000Z',
  },
  {
    id: 'seed-3',
    title: '三句话记法更稳',
    sentence1: '今天复习知识点时，我试着用三句话概括一页笔记。',
    sentence2: '相比长段落，这种方式让我更容易记住关键结论。',
    sentence3: '后面可以把每次复习都压缩成一张卡。',
    tags: ['学习', '总结', '方法'],
    sourceType: '学习',
    importance: 3,
    createdAt: '2026-05-13T12:00:00.000Z',
    updatedAt: '2026-05-13T12:00:00.000Z',
  },
];

function parseTags(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeCard(card) {
  return {
    id: card.id,
    title: card.title,
    sentence1: card.sentence1,
    sentence2: card.sentence2,
    sentence3: card.sentence3,
    tags: parseTags(card.tags),
    sourceType: card.sourceType,
    importance: card.importance,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    reviewedAt: card.reviewedAt ?? undefined,
  };
}

function serializeCard(card) {
  return {
    id: card.id,
    title: card.title,
    sentence1: card.sentence1,
    sentence2: card.sentence2,
    sentence3: card.sentence3,
    tags: JSON.stringify(card.tags ?? []),
    sourceType: card.sourceType,
    importance: card.importance,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    reviewedAt: card.reviewedAt ?? null,
  };
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
}

function openDatabase() {
  const db = new DatabaseSync(dataFile);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sentence1 TEXT NOT NULL,
      sentence2 TEXT NOT NULL,
      sentence3 TEXT NOT NULL,
      tags TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      importance INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      reviewedAt TEXT
    );
  `);

  return db;
}

const db = await (async () => {
  await ensureStore();
  const database = openDatabase();

  if (dbRowCount(database) === 0) {
    const legacyCards = await loadLegacyCards();
    if (legacyCards.length > 0) {
      insertManyCards(database, legacyCards);
    }
  }

  return database;
})();

function dbRowCount(database) {
  return database.prepare('SELECT COUNT(*) AS count FROM cards').get().count;
}

async function loadLegacyCards() {
  if (!existsSync(legacyJsonFile)) {
    return [...seedCards];
  }

  try {
    const content = await fs.readFile(legacyJsonFile, 'utf8');
    const cards = JSON.parse(content);
    return Array.isArray(cards) ? cards : [...seedCards];
  } catch {
    return [...seedCards];
  }
}

function insertManyCards(database, cards) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO cards (
      id,
      title,
      sentence1,
      sentence2,
      sentence3,
      tags,
      sourceType,
      importance,
      createdAt,
      updatedAt,
      reviewedAt
    ) VALUES (
      @id,
      @title,
      @sentence1,
      @sentence2,
      @sentence3,
      @tags,
      @sourceType,
      @importance,
      @createdAt,
      @updatedAt,
      @reviewedAt
    )
  `);

  database.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    for (const item of cards) {
      const normalized = normalizeCard(item);
      insert.run(serializeCard(normalized));
    }

    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function readCards() {
  return db
    .prepare('SELECT * FROM cards ORDER BY importance DESC, updatedAt DESC')
    .all()
    .map((card) => normalizeCard(card));
}

function writeCard(card) {
  db.prepare(`
    INSERT OR REPLACE INTO cards (
      id,
      title,
      sentence1,
      sentence2,
      sentence3,
      tags,
      sourceType,
      importance,
      createdAt,
      updatedAt,
      reviewedAt
    ) VALUES (
      @id,
      @title,
      @sentence1,
      @sentence2,
      @sentence3,
      @tags,
      @sourceType,
      @importance,
      @createdAt,
      @updatedAt,
      @reviewedAt
    )
  `).run(serializeCard(card));
}

function deleteCard(cardId) {
  db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
}

function getCardById(cardId) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  return card ? normalizeCard(card) : null;
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, response) => {
  response.json({ ok: true });
});

app.get('/api/cards', async (_, response) => {
  try {
    const cards = readCards();
    response.json(cards);
  } catch (error) {
    response.status(500).json({ message: '读取卡片失败', error: String(error) });
  }
});

app.post('/api/cards', async (request, response) => {
  try {
    const now = new Date().toISOString();
    const payload = {
      ...request.body,
      id: request.body.id ?? `card-${Date.now()}`,
      createdAt: request.body.createdAt ?? now,
      updatedAt: now,
    };

    writeCard(payload);
    response.status(201).json(normalizeCard(payload));
  } catch (error) {
    response.status(500).json({ message: '创建卡片失败', error: String(error) });
  }
});

app.put('/api/cards/:id', async (request, response) => {
  try {
    const updatedAt = new Date().toISOString();
    const existingCard = getCardById(request.params.id);

    if (!existingCard) {
      response.status(404).json({ message: '卡片不存在' });
      return;
    }

    const updatedCard = {
      ...existingCard,
      ...request.body,
      id: request.params.id,
      createdAt: request.body.createdAt ?? existingCard.createdAt,
      updatedAt,
      reviewedAt: request.body.reviewedAt ?? existingCard.reviewedAt ?? null,
    };

    writeCard(updatedCard);
    response.json(updatedCard);
  } catch (error) {
    response.status(500).json({ message: '更新卡片失败', error: String(error) });
  }
});

app.patch('/api/cards/:id/review', async (request, response) => {
  try {
    const reviewedAt = new Date().toISOString();
    const existingCard = getCardById(request.params.id);

    if (!existingCard) {
      response.status(404).json({ message: '卡片不存在' });
      return;
    }

    const updatedCard = {
      ...existingCard,
      reviewedAt,
      updatedAt: reviewedAt,
    };

    writeCard(updatedCard);
    response.json(updatedCard);
  } catch (error) {
    response.status(500).json({ message: '标记回顾失败', error: String(error) });
  }
});

app.delete('/api/cards/:id', async (request, response) => {
  try {
    deleteCard(request.params.id);
    response.status(204).end();
  } catch (error) {
    response.status(500).json({ message: '删除卡片失败', error: String(error) });
  }
});

app.listen(port, () => {
  console.log(`三句记忆卡 API running on http://localhost:${port}`);
});