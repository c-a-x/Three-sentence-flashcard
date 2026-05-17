import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  createCard,
  deleteCard,
  ensureSeededCards,
  getCardById,
  listCards,
  markCardReviewed,
  updateCard,
} from './api/_lib/cards-store.js';

function devApiPlugin() {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost');

        if (!requestUrl.pathname.startsWith('/api/')) {
          next();
          return;
        }

        response.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
          if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
            response.statusCode = 200;
            response.end(JSON.stringify({ ok: true }));
            return;
          }

          if (requestUrl.pathname === '/api/cards' && request.method === 'GET') {
            await ensureSeededCards();
            response.statusCode = 200;
            response.end(JSON.stringify(await listCards()));
            return;
          }

          if (requestUrl.pathname === '/api/cards' && request.method === 'POST') {
            const body = await readJsonBody(request);
            const now = new Date().toISOString();
            const card = await createCard({
              ...body,
              id: body.id ?? `card-${Date.now()}`,
              createdAt: body.createdAt ?? now,
              updatedAt: now,
            });

            response.statusCode = 201;
            response.end(JSON.stringify(card));
            return;
          }

          const cardId = getRequestCardId(requestUrl.pathname);

          if (!cardId) {
            response.statusCode = 400;
            response.end(JSON.stringify({ message: '缺少卡片 ID' }));
            return;
          }

          if (requestUrl.pathname === `/api/cards/${cardId}` && request.method === 'GET') {
            const card = await getCardById(cardId);
            if (!card) {
              response.statusCode = 404;
              response.end(JSON.stringify({ message: '卡片不存在' }));
              return;
            }

            response.statusCode = 200;
            response.end(JSON.stringify(card));
            return;
          }

          if (requestUrl.pathname === `/api/cards/${cardId}` && request.method === 'PUT') {
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
              response.statusCode = 404;
              response.end(JSON.stringify({ message: '卡片不存在' }));
              return;
            }

            response.statusCode = 200;
            response.end(JSON.stringify(card));
            return;
          }

          if (requestUrl.pathname === `/api/cards/${cardId}` && request.method === 'DELETE') {
            await deleteCard(cardId);
            response.statusCode = 204;
            response.end();
            return;
          }

          if (requestUrl.pathname === `/api/cards/${cardId}/review` && request.method === 'PATCH') {
            const existingCard = await getCardById(cardId);
            if (!existingCard) {
              response.statusCode = 404;
              response.end(JSON.stringify({ message: '卡片不存在' }));
              return;
            }

            const card = await markCardReviewed(cardId);
            response.statusCode = 200;
            response.end(JSON.stringify(card));
            return;
          }

          response.statusCode = 405;
          response.end(JSON.stringify({ message: 'Method Not Allowed' }));
        } catch (error) {
          response.statusCode = 500;
          response.end(JSON.stringify({ message: '开发环境 API 处理失败', error: String(error) }));
        }
      });
    },
  };
}

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

function getRequestCardId(pathname) {
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api' || parts[1] !== 'cards') {
    return '';
  }

  return decodeURIComponent(parts[2] ?? '');
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
});