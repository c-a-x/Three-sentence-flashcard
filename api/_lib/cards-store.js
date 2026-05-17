import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from 'redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..', '..');
const legacyJsonFile = path.join(repoRoot, 'server', 'data', 'cards.json');
const localDataDir = path.join(repoRoot, '.data');
const localDataFile = path.join(localDataDir, 'cards.json');
const storeKey = 'three-sentence-flashcard:cards';

let redisClientPromise = null;

function getRedisUrl() {
  return process.env.REDIS_URL ?? null;
}

async function getRedisClient() {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({ url: redisUrl });
      client.on('error', () => {});
      await client.connect();
      return client;
    })();
  }

  return redisClientPromise;
}

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
    tags: Array.isArray(card.tags) ? [...card.tags] : [],
    sourceType: card.sourceType,
    importance: card.importance,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    reviewedAt: card.reviewedAt ?? null,
  };
}

function hasKv() {
  return Boolean(getRedisUrl());
}

async function loadSeedCards() {
  if (existsSync(legacyJsonFile)) {
    try {
      const content = await fs.readFile(legacyJsonFile, 'utf8');
      const cards = JSON.parse(content);
      if (Array.isArray(cards) && cards.length > 0) {
        return cards.map(normalizeCard);
      }
    } catch {
      // Fall back to bundled seed cards.
    }
  }

  return seedCards.map(normalizeCard);
}

async function readLocalCards() {
  try {
    const content = await fs.readFile(localDataFile, 'utf8');
    const cards = JSON.parse(content);
    return Array.isArray(cards) ? cards.map(normalizeCard) : [];
  } catch {
    return [];
  }
}

async function writeLocalCards(cards) {
  await fs.mkdir(localDataDir, { recursive: true });
  await fs.writeFile(localDataFile, JSON.stringify(cards.map(serializeCard), null, 2), 'utf8');
}

async function readStoredCards() {
  if (hasKv()) {
    const redis = await getRedisClient();
    const storedValue = await redis.get(storeKey);
    const cards = typeof storedValue === 'string' ? JSON.parse(storedValue) : storedValue;

    if (Array.isArray(cards) && cards.length > 0) {
      return cards.map(normalizeCard);
    }

    const seedCardsList = await loadSeedCards();
    await redis.set(storeKey, JSON.stringify(seedCardsList.map(serializeCard)));
    return seedCardsList;
  }

  const localCards = await readLocalCards();

  if (localCards.length > 0) {
    return localCards;
  }

  const seedCardsList = await loadSeedCards();
  await writeLocalCards(seedCardsList);
  return seedCardsList;
}

async function saveCards(cards) {
  const normalizedCards = cards.map(normalizeCard);

  if (hasKv()) {
    const redis = await getRedisClient();
    await redis.set(storeKey, JSON.stringify(normalizedCards.map(serializeCard)));
    return normalizedCards;
  }

  await writeLocalCards(normalizedCards);
  return normalizedCards;
}

export async function ensureSeededCards() {
  return readStoredCards();
}

export async function listCards() {
  const cards = await readStoredCards();
  return [...cards].sort((left, right) => {
    const importanceDiff = right.importance - left.importance;
    if (importanceDiff !== 0) {
      return importanceDiff;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export async function getCardById(cardId) {
  const cards = await readStoredCards();
  return cards.find((card) => card.id === cardId) ?? null;
}

export async function createCard(card) {
  const cards = await readStoredCards();
  const nextCard = normalizeCard(card);
  const nextCards = [...cards.filter((existingCard) => existingCard.id !== nextCard.id), nextCard];
  await saveCards(nextCards);
  return nextCard;
}

export async function updateCard(cardId, payload) {
  const cards = await readStoredCards();
  const existingCard = cards.find((card) => card.id === cardId);

  if (!existingCard) {
    return null;
  }

  const nextCard = normalizeCard({
    ...existingCard,
    ...payload,
    id: cardId,
    createdAt: payload.createdAt ?? existingCard.createdAt,
    reviewedAt: payload.reviewedAt ?? existingCard.reviewedAt ?? null,
  });

  const nextCards = cards.map((card) => (card.id === cardId ? nextCard : card));
  await saveCards(nextCards);
  return nextCard;
}

export async function markCardReviewed(cardId) {
  const reviewedAt = new Date().toISOString();
  return updateCard(cardId, { reviewedAt, updatedAt: reviewedAt });
}

export async function deleteCard(cardId) {
  const cards = await readStoredCards();
  const nextCards = cards.filter((card) => card.id !== cardId);
  await saveCards(nextCards);
}
