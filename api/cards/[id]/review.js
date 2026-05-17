import { getCardById, markCardReviewed } from '../../_lib/cards-store.js';

function getCardId(request) {
  const url = new URL(request.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[2] ?? '');
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ message: 'Method Not Allowed' });
      return;
    }

    const cardId = getCardId(request);
    const existingCard = await getCardById(cardId);

    if (!existingCard) {
      response.status(404).json({ message: '卡片不存在' });
      return;
    }

    const updatedCard = await markCardReviewed(cardId);
    response.status(200).json(updatedCard);
  } catch (error) {
    response.status(500).json({ message: '标记回顾失败', error: String(error) });
  }
}
