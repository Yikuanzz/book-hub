import { useNavigate } from 'react-router-dom';
import { Clock, Play, Calendar, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Recent() {
  const navigate = useNavigate();
  const recentBooks = useStore((state) => state.getRecentBooks());

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
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-primary dark:text-white mb-2">
          最近阅读
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          继续你未完成的阅读之旅
        </p>
      </div>

      {recentBooks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-border dark:border-border-dark text-center">
          <Clock size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-primary dark:text-white mb-2">
            还没有阅读记录
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            去书库选一本书开始阅读吧
          </p>
          <button
            onClick={() => navigate('/library')}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium"
          >
            浏览书库
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {recentBooks.map((book) => {
            const progress = Math.round((book.currentPage / book.totalPages) * 100);
            return (
              <div
                key={book.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border dark:border-border-dark flex gap-5"
              >
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-24 h-32 object-cover rounded-xl shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-primary dark:text-white mb-1">
                        {book.title}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {book.author}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/reader/${book.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors"
                    >
                      <Play size={16} />
                      继续阅读
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>
                        第 {book.currentPage} / {book.totalPages} 页
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted dark:bg-muted-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      已读 {formatReadingTime(book.totalReadingTime)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} />
                      最近阅读 {book.lastReadAt}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
