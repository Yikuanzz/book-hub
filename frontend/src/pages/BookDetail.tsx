import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Play,
  Bookmark,
  Clock,
  FileText,
  Tag,
  Trash2,
  Quote,
} from 'lucide-react';
import { useStore } from '../store/useStore';

export function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useStore((state) => state.getBookById(bookId || ''));
  const bookmarks = useStore((state) => state.getBookmarksByBookId(bookId || ''));
  const highlights = useStore((state) => state.getHighlightsByBookId(bookId || ''));
  const removeBookmark = useStore((state) => state.removeBookmark);
  const removeHighlight = useStore((state) => state.removeHighlight);

  const [activeTab, setActiveTab] = useState<'info' | 'bookmarks' | 'highlights'>('info');

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">书籍不存在</p>
      </div>
    );
  }

  const progress = Math.round((book.currentPage / book.totalPages) * 100);

  const tabs = [
    { id: 'info', label: '书籍信息', icon: FileText },
    { id: 'bookmarks', label: `书签 (${bookmarks.length})`, icon: Bookmark },
    { id: 'highlights', label: `摘抄 (${highlights.length})`, icon: Quote },
  ];

  const formatReadingTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}`;
    }
    return `${mins}分钟`;
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted dark:hover:bg-muted-dark transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-display font-bold text-primary dark:text-white">
          书籍详情
        </h1>
      </div>

      {/* Book Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <img
            src={book.cover}
            alt={book.title}
            className="w-32 h-44 object-cover rounded-xl shadow-lg mx-auto sm:mx-0"
          />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-primary dark:text-white mb-1">
              {book.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{book.author}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
              <span className="px-3 py-1 bg-muted dark:bg-muted-dark rounded-lg text-sm text-gray-600 dark:text-gray-300">
                {book.category}
              </span>
              {book.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-accent/10 rounded-lg text-sm text-accent flex items-center gap-1"
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>阅读进度</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted dark:bg-muted-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {book.currentPage} / {book.totalPages} 页
              </p>
            </div>
            <button
              onClick={() => navigate(`/reader/${book.id}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-dark transition-colors"
            >
              <Play size={18} />
              {book.currentPage > 0 ? '继续阅读' : '开始阅读'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border dark:border-border-dark overflow-hidden">
        <div className="flex border-b border-border dark:border-border-dark">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-primary dark:text-white mb-3">
                  简介
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    格式
                  </p>
                  <p className="font-medium text-primary dark:text-white uppercase">
                    {book.format}
                  </p>
                </div>
                <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    页数
                  </p>
                  <p className="font-medium text-primary dark:text-white">
                    {book.totalPages} 页
                  </p>
                </div>
                <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    阅读时间
                  </p>
                  <p className="font-medium text-primary dark:text-white">
                    {formatReadingTime(book.totalReadingTime)}
                  </p>
                </div>
                <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    添加时间
                  </p>
                  <p className="font-medium text-primary dark:text-white">
                    {book.uploadedAt}
                  </p>
                </div>
              </div>

              {book.lastReadAt && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={16} />
                  <span>最近阅读: {book.lastReadAt}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark
                    size={48}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    还没有添加书签
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-4 bg-muted dark:bg-muted-dark rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Bookmark size={20} className="text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-primary dark:text-white">
                          第 {bm.page} 页
                        </p>
                        {bm.note && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {bm.note}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{bm.createdAt}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(bm.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {highlights.length === 0 ? (
                <div className="text-center py-8">
                  <Quote
                    size={48}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    还没有摘抄内容
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    在阅读时选中文字可以添加高亮摘抄
                  </p>
                </div>
              ) : (
                highlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-4 rounded-xl border-l-4"
                    style={{ borderLeftColor: hl.color, backgroundColor: `${hl.color}20` }}
                  >
                    <p
                      className="text-primary dark:text-white mb-3 leading-relaxed"
                      style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}
                    >
                      "{hl.text}"
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        第 {hl.page} 页 · {hl.createdAt}
                      </span>
                      <button
                        onClick={() => removeHighlight(hl.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
