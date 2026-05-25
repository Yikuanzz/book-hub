import { useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Flame,
  ChevronRight,
  Bookmark,
  Quote,
  Play,
} from 'lucide-react';
import { useStore, selectRecentBooks } from '../store/useStore';

export function Dashboard() {
  const navigate = useNavigate();
  const books = useStore((state) => state.books);
  const recentBooks = useStore(selectRecentBooks);
  const categories = useStore((state) => state.categories);
  const totalReadingTime = useStore((state) => state.totalReadingTime);
  const booksRead = useStore((state) => state.booksRead);
  const currentStreak = useStore((state) => state.currentStreak);
  const highlights = useStore((state) => state.highlights);

  const formatReadingTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}`;
    }
    return `${mins}分钟`;
  };

  const stats = [
    {
      icon: Clock,
      label: '总阅读时间',
      value: formatReadingTime(totalReadingTime),
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: BookOpen,
      label: '已读完',
      value: `${booksRead} 本`,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: Flame,
      label: '连续阅读',
      value: `${currentStreak} 天`,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      icon: Bookmark,
      label: '我的书库',
      value: `${books.length} 本`,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
  const currentlyReading = books.filter((b) => b.currentPage > 0 && b.currentPage < b.totalPages);

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-primary dark:text-white mb-2">
          欢迎回来
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          今天也是读书的好天气，继续你的阅读之旅吧
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-primary dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Reading */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary dark:text-white">
              继续阅读
            </h2>
            <button
              onClick={() => navigate('/recent')}
              className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight size={16} />
            </button>
          </div>

          {currentlyReading.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentlyReading.slice(0, 2).map((book) => {
                const progress = Math.round((book.currentPage / book.totalPages) * 100);
                return (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/reader/${book.id}`)}
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div className="flex gap-4">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-lg shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary dark:text-white truncate mb-1">
                          {book.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {book.author}
                        </p>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                            <span>第 {book.currentPage} 页</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-muted dark:bg-muted-dark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <button className="flex items-center gap-2 text-sm text-accent font-medium">
                          <Play size={14} /> 继续阅读
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-border dark:border-border-dark text-center">
              <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                还没有正在阅读的书籍
              </p>
              <button
                onClick={() => navigate('/library')}
                className="mt-4 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium"
              >
                去书库看看
              </button>
            </div>
          )}
        </div>

        {/* Recent Highlights */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary dark:text-white">
              精彩摘抄
            </h2>
            <button
              onClick={() => navigate('/notes')}
              className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
            >
              全部笔记 <ChevronRight size={16} />
            </button>
          </div>

          {randomHighlight ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border dark:border-border-dark">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Quote size={16} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  来自 《{books.find((b) => b.id === randomHighlight.bookId)?.title}》
                </span>
              </div>
              <p className="text-primary dark:text-white leading-relaxed mb-4" style={{ fontFamily: 'Crimson Pro, Georgia, serif' }}>
                "{randomHighlight.text}"
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>第 {randomHighlight.page} 页</span>
                <span>{randomHighlight.createdAt}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark text-center">
              <Quote size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                还没有摘抄
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold text-primary dark:text-white mb-4">
          浏览分类
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => navigate('/library')}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark text-left hover:shadow-md transition-all group"
          >
            <div
              className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: category.color }}
            >
              {category.bookCount}
            </div>
            <h3 className="font-medium text-primary dark:text-white text-sm">
              {category.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {category.bookCount} 本书
            </p>
          </button>
        ))}
        </div>
      </div>

      {/* Recent Books */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary dark:text-white">
            最近添加
          </h2>
          <button
            onClick={() => navigate('/library')}
            className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
          >
            查看全部 <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {books.slice(0, 6).map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/book/${book.id}`)}
              className="cursor-pointer group"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md mb-2">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-medium text-sm text-primary dark:text-white truncate">
                {book.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {book.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
