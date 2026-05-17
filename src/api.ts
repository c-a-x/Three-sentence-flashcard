import type { CardDraft, MemoryCard } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export interface UpdateCardPayload {
  title: string;
  sentence1: string;
  sentence2: string;
  sentence3: string;
  tags: string[];
  sourceType: CardDraft['sourceType'];
  importance: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchCards(): Promise<MemoryCard[]> {
  return request<MemoryCard[]>('/api/cards');
}

export async function createCard(card: MemoryCard): Promise<MemoryCard> {
  return request<MemoryCard>('/api/cards', {
    method: 'POST',
    body: JSON.stringify(card),
  });
}

export async function updateCard(cardId: string, payload: UpdateCardPayload, existingCreatedAt?: string, reviewedAt?: string): Promise<MemoryCard> {
  return request<MemoryCard>(`/api/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...payload,
      createdAt: existingCreatedAt,
      reviewedAt,
    }),
  });
}

export async function deleteCard(cardId: string): Promise<void> {
  await request<void>(`/api/cards/${cardId}`, {
    method: 'DELETE',
  });
}

export async function markCardReviewed(cardId: string): Promise<MemoryCard> {
  return request<MemoryCard>(`/api/cards/${cardId}/review`, {
    method: 'PATCH',
  });
}