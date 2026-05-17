import { useEffect, useMemo, useState } from 'react';
import type { CardDraft, CardTemplate, MemoryCard, SourceType } from './types';
import { createCard, deleteCard, fetchCards, markCardReviewed, updateCard } from './api';

const sourceTypes: SourceType[] = ['学习', '工作', '生活', '情绪', '灵感'];

const sourceClassMap: Record<SourceType, string> = {
  '学习': 'source-learn',
  '工作': 'source-work',
  '生活': 'source-life',
  '情绪': 'source-emotion',
  '灵感': 'source-inspiration',
};

const templates: Record<CardTemplate, CardDraft> = {
  '事件复盘型': {
    title: '',
    sentence1: '今天发生了什么？',
    sentence2: '我怎么看这件事？',
    sentence3: '下一步准备怎么做？',
    tags: '',
    sourceType: '工作',
    importance: 3,
  },
  '学习总结型': {
    title: '',
    sentence1: '今天学到了什么？',
    sentence2: '关键理解是什么？',
    sentence3: '如何在以后使用？',
    tags: '',
    sourceType: '学习',
    importance: 3,
  },
  '情绪记录型': {
    title: '',
    sentence1: '今天发生了什么？',
    sentence2: '我现在的情绪是什么？',
    sentence3: '我准备如何调整？',
    tags: '',
    sourceType: '情绪',
    importance: 3,
  },
};

const blankDraft: CardDraft = {
  title: '',
  sentence1: '',
  sentence2: '',
  sentence3: '',
  tags: '',
  sourceType: '生活',
  importance: 3,
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function importanceLabel(value: number): string {
  return ['低', '较低', '中', '较高', '高'][Math.max(0, Math.min(4, value - 1))] ?? '中';
}

function normalizeTags(tags: string): string[] {
  return tags
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function toDraft(card: MemoryCard): CardDraft {
  return {
    title: card.title,
    sentence1: card.sentence1,
    sentence2: card.sentence2,
    sentence3: card.sentence3,
    tags: card.tags.join(' '),
    sourceType: card.sourceType,
    importance: card.importance,
  };
}

function createId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SourceIndicator({ type }: { type: SourceType }) {
  return (
    <span className="source-indicator">
      <span className={`source-dot ${sourceClassMap[type]}`} aria-hidden="true" />
      {type}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card-item" aria-hidden="true">
      <div className="card-item-head">
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: '40%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 12, width: '80%' }} />
    </div>
  );
}

export default function App() {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [draft, setDraft] = useState<CardDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'全部' | SourceType>('全部');
  const [minImportance, setMinImportance] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState('准备好开始记录你的第一张三句话卡片。');
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCards() {
      try {
        setIsLoading(true);
        const initialCards = await fetchCards();

        if (cancelled) {
          return;
        }

        setCards(initialCards);
        setSelectedId(initialCards[0]?.id ?? null);
        setStatusMessage(initialCards.length > 0 ? '已连接到后端数据服务。' : '后端已连接，但还没有卡片。');
        setApiReady(true);
      } catch {
        if (!cancelled) {
          setApiReady(false);
          setStatusMessage('后端暂时不可用，请先启动 API 服务。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCards();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...cards]
      .sort((left, right) => {
        const importanceDiff = right.importance - left.importance;
        if (importanceDiff !== 0) {
          return importanceDiff;
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })
      .filter((card) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [card.title, card.sentence1, card.sentence2, card.sentence3, card.tags.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);

        const matchesSource = filterSource === '全部' || card.sourceType === filterSource;
        const matchesImportance = card.importance >= minImportance;

        return matchesQuery && matchesSource && matchesImportance;
      });
  }, [cards, filterSource, minImportance, query]);

  const selectedCard = useMemo(() => {
    if (selectedId) {
      return cards.find((card) => card.id === selectedId) ?? filteredCards[0] ?? null;
    }

    return filteredCards[0] ?? null;
  }, [cards, filteredCards, selectedId]);

  const stats = useMemo(() => {
    const total = cards.length;
    const important = cards.filter((card) => card.importance >= 4).length;
    const reviewed = cards.filter((card) => Boolean(card.reviewedAt)).length;
    const today = new Date().toDateString();
    const recent = cards.filter((card) => new Date(card.createdAt).toDateString() === today).length;

    return { total, important, reviewed, recent };
  }, [cards]);

  function handleDraftChange<K extends keyof CardDraft>(key: K, value: CardDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyTemplate(templateName: CardTemplate) {
    const next = templates[templateName];
    setDraft((current) => ({
      ...current,
      ...next,
      title: current.title,
    }));
    setStatusMessage(`已套用「${templateName}」模板。`);
  }

  function resetEditor() {
    setDraft(blankDraft);
    setEditingId(null);
    setStatusMessage('已清空编辑器，可以开始新建。');
  }

  function startEdit(card: MemoryCard) {
    setEditingId(card.id);
    setDraft(toDraft(card));
    setSelectedId(card.id);
    setStatusMessage(`正在编辑「${card.title}」。`);
  }

  async function handleDelete(cardId: string) {
    try {
      await deleteCard(cardId);
      setCards((current) => current.filter((card) => card.id !== cardId));

      if (editingId === cardId) {
        resetEditor();
      }

      if (selectedId === cardId) {
        setSelectedId(null);
      }

      setStatusMessage('卡片已删除。');
    } catch {
      setStatusMessage('删除失败，请检查后端服务是否正常运行。');
    }
  }

  async function handleReview(cardId: string) {
    try {
      const updatedCard = await markCardReviewed(cardId);
      setCards((current) => current.map((card) => (card.id === cardId ? updatedCard : card)));
      setSelectedId(cardId);
      setStatusMessage('已标记为本次回顾。');
    } catch {
      setStatusMessage('回顾标记失败，请检查后端服务。');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.sentence1.trim() || !draft.sentence2.trim() || !draft.sentence3.trim()) {
      setStatusMessage('标题和三句话都需要填写。');
      return;
    }

    setIsSubmitting(true);

    const now = new Date().toISOString();
    const existingCard = editingId ? cards.find((card) => card.id === editingId) : null;
    const payload: MemoryCard = {
      id: editingId ?? createId(),
      title: draft.title.trim(),
      sentence1: draft.sentence1.trim(),
      sentence2: draft.sentence2.trim(),
      sentence3: draft.sentence3.trim(),
      tags: normalizeTags(draft.tags),
      sourceType: draft.sourceType,
      importance: draft.importance,
      createdAt: existingCard?.createdAt ?? now,
      updatedAt: now,
      reviewedAt: existingCard?.reviewedAt,
    };

    try {
      const savedCard = editingId
        ? await updateCard(payload.id, {
            title: payload.title,
            sentence1: payload.sentence1,
            sentence2: payload.sentence2,
            sentence3: payload.sentence3,
            tags: payload.tags,
            sourceType: payload.sourceType,
            importance: payload.importance,
          },
          existingCard?.createdAt,
          existingCard?.reviewedAt,
        )
        : await createCard(payload);

      setCards((current) => {
        const exists = current.some((card) => card.id === savedCard.id);
        return exists ? current.map((card) => (card.id === savedCard.id ? savedCard : card)) : [savedCard, ...current];
      });

      setSelectedId(savedCard.id);
      setEditingId(null);
      setDraft(blankDraft);
      setStatusMessage(editingId ? '卡片已更新。' : '新卡片已保存。');
      setApiReady(true);
    } catch {
      setStatusMessage('保存失败，请检查后端服务是否已启动。');
      setApiReady(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function pickRandomCard() {
    if (filteredCards.length === 0) {
      setStatusMessage('当前没有符合筛选条件的卡片。');
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredCards.length);
    const card = filteredCards[randomIndex];
    setSelectedId(card.id);
    setStatusMessage(`抽到了一张旧卡：${card.title}。`);
  }

  const relatedCards = useMemo(() => {
    if (!selectedCard) {
      return [];
    }

    const selectedTags = new Set(selectedCard.tags);

    return cards
      .filter((card) => card.id !== selectedCard.id)
      .map((card) => {
        const sharedTags = card.tags.filter((tag) => selectedTags.has(tag)).length;
        const importanceGap = Math.abs(card.importance - selectedCard.importance);
        const score = sharedTags * 3 - importanceGap;

        return { card, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ card }) => card);
  }, [cards, selectedCard]);

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <span className="nav-brand">三句记忆卡</span>
        <ul className="nav-links">
          <li className="active">记录</li>
          <li>回顾</li>
          <li>关于</li>
        </ul>
        <span className="nav-status" role="status" aria-live="polite">
          <span className={`nav-status-dot ${apiReady ? '' : 'offline'}`} aria-hidden="true" />
          {apiReady ? '在线' : '离线'}
        </span>
      </nav>

      <div className="main-layout">
        <main className="content-area">
          <div className="page-header">
            <h1>把每天发生的事，压缩成可回看的三句话。</h1>
            <p>极简记忆工具 — 记录时只写三句话，回顾时就能快速找回事件、判断和下一步动作。</p>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <strong>{stats.total}</strong>
              <span>总卡片</span>
            </div>
            <div className="stat-item">
              <strong>{stats.recent}</strong>
              <span>今日新增</span>
            </div>
            <div className="stat-item">
              <strong>{stats.important}</strong>
              <span>高优先级</span>
            </div>
            <div className="stat-item">
              <strong>{stats.reviewed}</strong>
              <span>已回顾</span>
            </div>
          </div>

          <section className="compose-section" aria-label="快速记录">
            <div className="section-head">
              <div>
                <p className="kicker">快速记录</p>
                <h2>{editingId ? '编辑卡片' : '新建卡片'}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={resetEditor} aria-label="清空编辑器">
                清空
              </button>
            </div>

            <div className="template-row" role="group" aria-label="选择模板">
              {Object.keys(templates).map((name) => (
                <button key={name} className="template-chip" type="button" onClick={() => applyTemplate(name as CardTemplate)} aria-label={`套用${name}模板`}>
                  {name}
                </button>
              ))}
            </div>

            <form className="compose-form" onSubmit={handleSubmit} aria-label="卡片编辑表单">
              <label htmlFor="card-title">
                <span>标题</span>
                <input
                  id="card-title"
                  value={draft.title}
                  onChange={(event) => handleDraftChange('title', event.target.value)}
                  placeholder="例如：把需求说清楚"
                />
              </label>

              <label htmlFor="card-sentence1">
                <span>第一句话</span>
                <textarea
                  id="card-sentence1"
                  value={draft.sentence1}
                  onChange={(event) => handleDraftChange('sentence1', event.target.value)}
                  placeholder="发生了什么？"
                  rows={2}
                />
              </label>

              <label htmlFor="card-sentence2">
                <span>第二句话</span>
                <textarea
                  id="card-sentence2"
                  value={draft.sentence2}
                  onChange={(event) => handleDraftChange('sentence2', event.target.value)}
                  placeholder="你的理解、判断或感受是什么？"
                  rows={2}
                />
              </label>

              <label htmlFor="card-sentence3">
                <span>第三句话</span>
                <textarea
                  id="card-sentence3"
                  value={draft.sentence3}
                  onChange={(event) => handleDraftChange('sentence3', event.target.value)}
                  placeholder="下一步要做什么？"
                  rows={2}
                />
              </label>

              <div className="grid-two">
                <label htmlFor="card-tags">
                  <span>标签</span>
                  <input
                    id="card-tags"
                    value={draft.tags}
                    onChange={(event) => handleDraftChange('tags', event.target.value)}
                    placeholder="学习 复盘 表达"
                  />
                </label>

                <label htmlFor="card-source">
                  <span>来源类型</span>
                  <select id="card-source" value={draft.sourceType} onChange={(event) => handleDraftChange('sourceType', event.target.value as SourceType)}>
                    {sourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label htmlFor="card-importance">
                <span>重要程度：{importanceLabel(draft.importance)}</span>
                <input
                  id="card-importance"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={draft.importance}
                  onChange={(event) => handleDraftChange('importance', Number(event.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-valuenow={draft.importance}
                  aria-valuetext={importanceLabel(draft.importance)}
                />
              </label>

              <button className="primary-button" type="submit" disabled={isSubmitting} aria-label={editingId ? '保存修改' : '保存卡片'}>
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    保存中...
                  </>
                ) : (
                  editingId ? '保存修改' : '保存卡片'
                )}
              </button>
            </form>

            <p className="status-line" role="status" aria-live="polite">{statusMessage}</p>
          </section>

          {selectedCard && (
            <section className="detail-section" aria-label="卡片详情">
              <div className="section-head">
                <div>
                  <p className="kicker">卡片详情</p>
                  <h2>{selectedCard.title}</h2>
                </div>
                <span className={`importance-badge importance-${selectedCard.importance}`}>
                  {importanceLabel(selectedCard.importance)}
                </span>
              </div>

              <article className="detail-card">
                <div className="detail-meta">
                  <span><SourceIndicator type={selectedCard.sourceType} /></span>
                  <span>{formatDate(selectedCard.createdAt)}</span>
                  {selectedCard.reviewedAt ? (
                    <span>已回顾：{formatDate(selectedCard.reviewedAt)}</span>
                  ) : (
                    <span>尚未回顾</span>
                  )}
                </div>

                <p className="sentence">{selectedCard.sentence1}</p>
                <p className="sentence">{selectedCard.sentence2}</p>
                <p className="sentence">{selectedCard.sentence3}</p>

                <div className="tag-row">
                  {selectedCard.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="detail-actions">
                  <button className="primary-button secondary" type="button" onClick={() => handleReview(selectedCard.id)} aria-label="标记回顾">
                    标记回顾
                  </button>
                  <button className="primary-button secondary" type="button" onClick={() => startEdit(selectedCard)} aria-label="编辑卡片">
                    编辑
                  </button>
                  <button className="primary-button danger" type="button" onClick={() => handleDelete(selectedCard.id)} aria-label="删除卡片">
                    删除
                  </button>
                </div>
              </article>

              {relatedCards.length > 0 && (
                <div className="related-block">
                  <div className="related-head">
                    <h3>相似卡片</h3>
                    <span>{relatedCards.length} 条</span>
                  </div>
                  <div className="related-list">
                    {relatedCards.map((card) => (
                      <button key={card.id} className="related-item" type="button" onClick={() => setSelectedId(card.id)} aria-label={`查看相似卡片：${card.title}`}>
                        <strong>{card.title}</strong>
                        <span>{card.tags.join(' · ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>卡片目录</h3>

            <div className="sidebar-search">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、内容、标签"
                aria-label="搜索卡片"
              />
            </div>

            <div className="filter-row">
              <select value={filterSource} onChange={(event) => setFilterSource(event.target.value as '全部' | SourceType)} aria-label="按来源类型筛选">
                <option value="全部">全部来源</option>
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select value={minImportance} onChange={(event) => setMinImportance(Number(event.target.value))} aria-label="按重要程度筛选">
                <option value={1}>重要度不限</option>
                <option value={2}>至少较低</option>
                <option value={3}>至少中</option>
                <option value={4}>至少较高</option>
                <option value={5}>仅最高</option>
              </select>
            </div>

            <div className="card-list" role="list" aria-label="卡片列表">
              {isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : filteredCards.length === 0 ? (
                <div className="empty-state" role="listitem">
                  <h3>没有找到符合条件的卡片</h3>
                  <p>可以放宽筛选，或者直接新建一张卡片。</p>
                </div>
              ) : (
                filteredCards.map((card) => (
                  <button
                    key={card.id}
                    className={`card-item ${selectedCard?.id === card.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => setSelectedId(card.id)}
                    role="listitem"
                    aria-label={`卡片：${card.title}`}
                    aria-selected={selectedCard?.id === card.id}
                  >
                    <div className="card-item-head">
                      <p className="card-title">{card.title}</p>
                      <span className={`importance-badge importance-${card.importance}`}>{card.importance}</span>
                    </div>
                    <p className="card-meta">
                      <SourceIndicator type={card.sourceType} /> · {formatDate(card.createdAt)}
                    </p>
                    <p className="card-preview">{card.sentence1}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <button className="ghost-button" type="button" onClick={pickRandomCard} aria-label="随机回顾一张卡片" style={{ width: '100%', textAlign: 'center' }}>
              随机回顾
            </button>
          </div>
        </aside>
      </div>

      <footer className="page-footer">
        三句记忆卡 — 用三句话记录和回顾每一天
      </footer>
    </div>
  );
}
