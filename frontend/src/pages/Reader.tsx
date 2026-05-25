import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Highlighter,
  Settings,
  AArrowUp,
  AArrowDown,
  Type,
  List,
  Clock,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { bookContent } from '../data/mockData';

const highlightColors = [
  { name: '黄色', value: '#FEF08A' },
  { name: '绿色', value: '#BBF7D0' },
  { name: '红色', value: '#FECACA' },
  { name: '紫色', value: '#DDD6FE' },
  { name: '蓝色', value: '#BFDBFE' },
];

export function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useStore((state) => state.getBookById(bookId || ''));
  const updateReadingProgress = useStore((state) => state.updateReadingProgress);
  const addBookmark = useStore((state) => state.addBookmark);
  const addHighlight = useStore((state) => state.addHighlight);
  const bookmarks = useStore((state) => state.getBookmarksByBookId(bookId || ''));

  const [currentChapter, setCurrentChapter] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FEF08A');
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (book) {
      // Calculate chapter based on page
      const chapter = Math.floor(book.currentPage / 50) % bookContent.chapters.length;
      setCurrentChapter(chapter);
    }
    setReadingStartTime(Date.now());
  }, [book]);

  useEffect(() => {
    return () => {
      if (readingStartTime && book) {
        const readingTime = Math.floor((Date.now() - readingStartTime) / 60000);
        if (readingTime > 0) {
          updateReadingProgress(book.id, book.currentPage + 1, readingTime);
        }
      }
    };
  }, [readingStartTime, book, updateReadingProgress]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">书籍不存在</p>
      </div>
    );
  }

  const progress = Math.round((book.currentPage / book.totalPages) * 100);
  const chapter = bookContent.chapters[currentChapter];

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleAddHighlight = () => {
    if (selectedText) {
      addHighlight({
        bookId: book.id,
        text: selectedText,
        page: book.currentPage + currentChapter * 50,
        color: selectedColor,
      });
      setSelectedText('');
    }
  };

  const handleAddBookmark = () => {
    addBookmark({
      bookId: book.id,
      page: book.currentPage + currentChapter * 50,
    });
  };

  const handleChapterChange = (index: number) => {
    setCurrentChapter(index);
    setShowToc(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border dark:border-border-dark px-4 flex items-center justify-between">
        <button
          onClick={() => navigate(`/book/${book.id}`)}
          className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted-dark transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-medium text-sm text-primary dark:text-white truncate max-w-48">
            {book.title}
          </h1>
          <p className="text-xs text-gray-500">{chapter.title}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddBookmark}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted-dark transition-colors"
            title="添加书签"
          >
            <BookmarkPlus size={20} />
          </button>
          <button
            onClick={() => setShowToc(!showToc)}
            className={`p-2 rounded-lg transition-colors ${
              showToc ? 'bg-accent text-white' : 'hover:bg-muted dark:hover:bg-muted-dark'
            }`}
            title="目录"
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-accent text-white' : 'hover:bg-muted dark:hover:bg-muted-dark'
            }`}
            title="设置"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted dark:bg-muted-dark">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* TOC Sidebar */}
      {showToc && (
        <div className="fixed right-0 top-14 bottom-0 w-64 bg-white dark:bg-zinc-900 border-l border-border dark:border-border-dark z-20 overflow-y-auto slide-up">
          <div className="p-4">
            <h3 className="font-semibold text-primary dark:text-white mb-4">目录</h3>
            <div className="space-y-1">
              {bookContent.chapters.map((ch, index) => (
                <button
                  key={index}
                  onClick={() => handleChapterChange(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    index === currentChapter
                      ? 'bg-accent text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-muted dark:hover:bg-muted-dark'
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed right-0 top-14 bottom-0 w-64 bg-white dark:bg-zinc-900 border-l border-border dark:border-border-dark z-20 overflow-y-auto slide-up">
          <div className="p-4 space-y-6">
            <div>
              <h3 className="font-semibold text-primary dark:text-white mb-3 flex items-center gap-2">
                <Type size={18} /> 字体大小
              </h3>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="p-2 rounded-lg bg-muted dark:bg-muted-dark hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <AArrowDown size={20} />
                </button>
                <span className="font-medium text-primary dark:text-white">
                  {fontSize}px
                </span>
                <button
                  onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                  className="p-2 rounded-lg bg-muted dark:bg-muted-dark hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <AArrowUp size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Selection Toolbar */}
      {selectedText && (
        <div className="fixed left-1/2 -translate-x-1/2 top-20 z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-border dark:border-border-dark p-2 flex items-center gap-2 slide-up">
          <div className="flex gap-1">
            {highlightColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color.value
                    ? 'border-accent scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <div className="w-px h-6 bg-border dark:bg-border-dark" />
          <button
            onClick={handleAddHighlight}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted-dark text-accent flex items-center gap-1.5"
          >
            <Highlighter size={18} />
            <span className="text-sm font-medium">高亮</span>
          </button>
          <button
            onClick={() => setSelectedText('')}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted-dark text-gray-500"
          >
            <Check size={18} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div
          ref={contentRef}
          className="reading-mode"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          onMouseUp={handleTextSelection}
        >
          <h2 className="text-2xl font-display font-bold text-primary dark:text-white mb-8 text-center">
            {chapter.title}
          </h2>
          {chapter.content.split('\n\n').map((paragraph, index) => (
            <p
              key={index}
              className="text-primary dark:text-white mb-6 first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left"
            >
              {paragraph.trim()}
            </p>
          ))}
        </div>

        {/* Page Navigation */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-border dark:border-border-dark">
          <button
            onClick={() => {
              if (currentChapter > 0) {
                setCurrentChapter(currentChapter - 1);
                updateReadingProgress(book.id, Math.max(0, book.currentPage - 50));
              }
            }}
            disabled={currentChapter === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted dark:bg-muted-dark text-primary dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            上一章
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            第 {currentChapter + 1} / {bookContent.chapters.length} 章
          </span>
          <button
            onClick={() => {
              if (currentChapter < bookContent.chapters.length - 1) {
                setCurrentChapter(currentChapter + 1);
                updateReadingProgress(book.id, book.currentPage + 50);
              }
            }}
            disabled={currentChapter === bookContent.chapters.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted dark:bg-muted-dark text-primary dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一章
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Reading indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-border dark:border-border-dark">
        <Clock size={16} className="text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          已读 {progress}%
        </span>
      </div>
    </div>
  );
}
