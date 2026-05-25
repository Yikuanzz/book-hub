import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, Filter, Tag, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore';

type ViewMode = 'grid' | 'list';

export function Library() {
  const navigate = useNavigate();
  const books = useStore((state) => state.books);
  const categories = useStore((state) => state.categories);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const allTags = Array.from(new Set(books.flatMap((book) => book.tags)));

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some((tag) => book.tags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary dark:text-white">
            我的书库
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            共 {filteredBooks.length} 本书籍
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="搜索书籍..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-xl bg-muted dark:bg-muted-dark border-0 text-sm text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
          />
        </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-colors ${
              showFilters
                ? 'bg-accent text-white'
                : 'bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-400'
            }`}
          >
            <Filter size={20} />
          </button>
          <div className="flex bg-muted dark:bg-muted-dark rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-800 text-primary dark:text-white'
                  : 'text-gray-400'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-800 text-primary dark:text-white'
                  : 'text-gray-400'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark space-y-4 slide-up">
          <div>
            <h3 className="text-sm font-medium text-primary dark:text-white mb-2">
              分类
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-accent text-white'
                    : 'bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-400'
                }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.name ? null : category.name
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.name
                      ? 'bg-accent text-white'
                      : 'bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary dark:text-white mb-2">
              标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                    selectedTags.includes(tag)
                      ? 'bg-accent text-white'
                      : 'bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Tag size={14} />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Books */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-border dark:border-border-dark text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-primary dark:text-white mb-2">
            没有找到书籍
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            尝试调整搜索条件或清除筛选器
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredBooks.map((book) => {
            const progress = Math.round(
              (book.currentPage / book.totalPages) * 100
            );
            return (
              <div
                key={book.id}
                onClick={() => navigate(`/book/${book.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-border dark:border-border-dark cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="relative aspect-[3/4]">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  {book.currentPage > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reader/${book.id}`);
                      }}
                      className="px-4 py-2 bg-white text-primary font-medium rounded-lg text-sm"
                    >
                      开始阅读
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-primary dark:text-white truncate mb-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                    {book.author}
                  </p>
                  <span className="inline-block px-2 py-0.5 bg-muted dark:bg-muted-dark rounded text-xs text-gray-500 dark:text-gray-400">
                    {book.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book) => {
            const progress = Math.round(
              (book.currentPage / book.totalPages) * 100
            );
            return (
              <div
                key={book.id}
                onClick={() => navigate(`/book/${book.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-border-dark cursor-pointer hover:shadow-md transition-all flex gap-4"
              >
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-16 h-24 object-cover rounded-lg shadow"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-primary dark:text-white truncate">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {book.author}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-muted dark:bg-muted-dark rounded-lg text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {book.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {book.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>
                          {book.currentPage}/{book.totalPages} 页
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted dark:bg-muted-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reader/${book.id}`);
                      }}
                      className="ml-4 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium"
                    >
                      阅读
                    </button>
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
