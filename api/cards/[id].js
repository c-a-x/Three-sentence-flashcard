import { deleteCard, getCardById, updateCard } from '../_lib/cards-store.js';

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

function getCardId(request) {
  const url = new URL(request.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[2] ?? '');
}

export default async function handler(request, response) {
  try {
    const cardId = getCardId(request);

    if (!cardId) {
      response.status(400).json({ message: '缺少卡片 ID' });
      return;
    }

    if (request.method === 'GET') {
      const card = await getCardById(cardId);
      if (!card) {
        response.status(404).json({ message: '卡片不存在' });
        return;
      }

      response.status(200).json(card);
      return;
    }

    if (request.method === 'PUT') {
      const body = await readJsonBody(request);
      const updatedAt = new Date().toISOString();
      const card = await updateCard(cardId, {
        ...body,
        id: cardId,
        createdAt: body.createdAt,
        updatedAt,
        reviewedAt: body.reviewedAt ?? null,
      });

      if (!card) {
        response.status(404).json({ message: '卡片不存在' });
        return;
      }

      response.status(200).json(card);
      return;
    }

    if (request.method === 'DELETE') {
      await deleteCard(cardId);
      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    response.status(500).json({ message: '处理卡片失败', error: String(error) });
  }
}
