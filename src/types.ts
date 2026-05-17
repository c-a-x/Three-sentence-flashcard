export type SourceType = '学习' | '工作' | '生活' | '情绪' | '灵感';

export type CardTemplate = '事件复盘型' | '学习总结型' | '情绪记录型';

export interface MemoryCard {
  id: string;
  title: string;
  sentence1: string;
  sentence2: string;
  sentence3: string;
  tags: string[];
  sourceType: SourceType;
  importance: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface CardDraft {
  title: string;
  sentence1: string;
  sentence2: string;
  sentence3: string;
  tags: string;
  sourceType: SourceType;
  importance: number;
}