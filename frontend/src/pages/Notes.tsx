import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quote, Bookmark, Filter, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore';

type Tab = 'highlights' | 'bookmarks';

export function Notes() {
  const navigate = useNavigate();
  const highlights = useStore((state) => state.highlights);
  const bookmarks = useStore((state) => state.bookmarks);
  const books = useStore((state) => state.books);
  const [activeTab, setActiveTab] = useState<Tab>('highlights');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  const tabs = [
    { id: 'highlights', label: '摘抄', icon: Quote, count: highlights.length },
    { id: 'bookmarks', label: '书签', icon: Bookmark, count: bookmarks.length },
  ];

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-primary dark:text-white mb-2">
          我的笔记
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          你收藏的所有高亮和书签
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={16} />
          筛选:
        </div>
        <select
          value={selectedBook || ''}
          onChange={(e) => setSelectedBook(e.target.value || null)}
          className="px-3 py-2 rounded-xl bg-muted dark:bg-muted-dark border-0 text-sm text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">全部书籍</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-6">
        <div className="flex border-b border-border dark:border-border-dark">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className="px-2 py-0.5 rounded-full bg-muted dark:bg-muted-dark text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'highlights' && (
        <div className="space-y-4">
          {highlights
            .filter((hl) => !selectedBook || hl.bookId === selectedBook)
            .map((hl) => {
              const book = books.find((b) => b.id === hl.bookId);
              return (
                <div
                  key={hl.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border dark:border-border-dark border-l-4"
                  style={{ borderLeftColor: hl.color }}
                >
                  <button
                    onClick={() => navigate(`/book/${hl.bookId}`)}
                    className="flex items-center gap-2 text-sm text-accent mb-3 hover:underline"
                  >
                    <BookOpen size={14} />
                    {book?.title || '未知书籍'}
                  </button>
                  <p
                    className="text-primary dark:text-white mb-3 leading-relaxed"
                    style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}
                  >
                    "{hl.text}"
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>第 {hl.page} 页</span>
                    <span>{hl.createdAt}</span>
                  </div>
                </div>
              );
            })}
          {highlights.filter((hl) => !selectedBook || hl.bookId === selectedBook)
            .length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-border dark:border-border-dark text-center">
              <Quote size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                还没有摘抄内容
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="space-y-3">
          {bookmarks
            .filter((bm) => !selectedBook || bm.bookId === selectedBook)
            .map((bm) => {
              const book = books.find((b) => b.id === bm.bookId);
              return (
                <div
                  key={bm.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Bookmark size={20} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/book/${bm.bookId}`)}
                      className="font-medium text-primary dark:text-white hover:text-accent truncate block"
                    >
                      {book?.title || '未知书籍'}
                    </button>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      第 {bm.page} 页 · {bm.createdAt}
                    </p>
                  </div>
                  {bm.note && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-32">
                      {bm.note}
                    </span>
                  )}
                </div>
              );
            })}
          {bookmarks.filter((bm) => !selectedBook || bm.bookId === selectedBook)
            .length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-border dark:border-border-dark text-center">
              <Bookmark size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                还没有添加书签
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
