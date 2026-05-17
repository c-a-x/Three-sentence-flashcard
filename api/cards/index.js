import { createCard, ensureSeededCards, listCards } from '../_lib/cards-store.js';

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  let rawBody = '';

  for await (const chunk of request) {
    rawBody += chunk;
  }

  if (!rawBody.trim()) {
    return {};
  }

  return JSON.parse(rawBody);
}

function setCorsHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  try {
    if (request.method === 'GET') {
      await ensureSeededCards();
      const cards = await listCards();
      response.status(200).json(cards);
      return;
    }

    if (request.method === 'POST') {
      const now = new Date().toISOString();
      const body = await readJsonBody(request);
      const payload = {
        ...body,
        id: body.id ?? `card-${Date.now()}`,
        createdAt: body.createdAt ?? now,
        updatedAt: now,
      };

      const card = await createCard(payload);
      response.status(201).json(card);
      return;
    }

    response.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    response.status(500).json({ message: '处理卡片列表失败', error: String(error) });
  }
}
