import { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2, ImageIcon, Check } from 'lucide-react';
import type { LibraryBook } from '../store/booksStore';
import { CoverCropper } from './CoverCropper';

interface EditBookModalProps {
  book: LibraryBook;
  allCategories: string[];
  onSave: (patch: Partial<Omit<LibraryBook, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Deterministic accent gradient (mirrors App.tsx)
const COVER_GRADIENTS = [
  'from-rose-400    to-rose-600',
  'from-orange-400  to-orange-600',
  'from-amber-400   to-amber-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400    to-teal-600',
  'from-cyan-400    to-cyan-600',
  'from-blue-400    to-blue-600',
  'from-indigo-400  to-indigo-600',
  'from-violet-400  to-violet-600',
  'from-fuchsia-400 to-fuchsia-600',
];
function coverGradient(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

export function EditBookModal({
  book,
  allCategories,
  onSave,
  onDelete,
  onClose,
}: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [category, setCategory] = useState(book.category);
  const [cover, setCover] = useState(book.cover);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title on open
  useEffect(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showDeleteConfirm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setCropImage(result);
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const trimmedCategory = category.trim();
    if (!trimmedTitle) {
      titleInputRef.current?.focus();
      return;
    }
    onSave({
      title: trimmedTitle,
      author: trimmedAuthor || '未知作者',
      category: trimmedCategory || '未分类',
      cover,
    });
    onClose();
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    setCategory(trimmed);
    setNewCategoryInput('');
  };

  const handleCropConfirm = (croppedImage: string) => {
    setCover(croppedImage);
    setShowCropper(false);
    setCropImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImage(null);
  };

  return (
    <>
      {/* Cover Cropper */}
      {showCropper && cropImage && (
        <CoverCropper
          imageSrc={cropImage}
          onCrop={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-book-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2
            id="edit-book-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            编辑书籍信息
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Cover + basic info side-by-side */}
            <div className="flex gap-4">
              {/* Cover — no hover overlay, buttons always visible below */}
              <div className="shrink-0">
                <button
                  type="button"
                  className="relative w-24 h-32 rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-sm text-left"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="更换封面"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt="封面预览"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${coverGradient(
                        title || '未'
                      )} flex items-center justify-center text-white`}
                    >
                      <span className="font-semibold text-xl drop-shadow-sm">
                        {(title || '未').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {/* Action buttons — always visible */}
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-1 px-1.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-0.5"
                  >
                    <ImageIcon size={10} />
                    {cover ? '更换' : '上传'}
                  </button>
                  {cover && (
                    <button
                      type="button"
                      onClick={() => setCover('')}
                      className="py-1 px-1.5 text-[10px] font-medium rounded-md bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-0.5"
                    >
                      <Trash2 size={10} />
                      移除
                    </button>
                  )}
                </div>
              </div>

              {/* Title + Author */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <label
                    htmlFor="book-title"
                    className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5"
                  >
                    书名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    id="book-title"
                    type="text"
                    name="title"
                    autoComplete="off"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：百年孤独"
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="book-author"
                    className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5"
                  >
                    作者
                  </label>
                  <input
                    id="book-author"
                    type="text"
                    name="author"
                    autoComplete="off"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="例如：加西亚·马尔克斯"
                    maxLength={80}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                分类
              </label>

              {/* Category grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {allCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`h-9 flex items-center justify-center px-1.5 rounded-lg text-xs font-medium transition-[colors,shadow,transform] duration-200 ${
                      category === c
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {category === c && (
                      <Check size={10} className="shrink-0 mr-0.5" />
                    )}
                    <span className="truncate">{c}</span>
                  </button>
                ))}
              </div>

              {/* Inline custom category */}
              <div className="relative">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  placeholder="输入新分类名称并回车"
                  maxLength={20}
                  className="w-full h-9 px-3 text-sm rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                />
                {newCategoryInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2.5 text-[10px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition flex items-center"
                  >
                    添加
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer — delete on left, cancel/save on right */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                删除书籍
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600 dark:text-red-400 font-medium">
                  确认删除？
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition"
                >
                  删除
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  取消
                </button>
              </div>
            )}

            {!showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-zinc-700 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed text-white shadow-sm transition"
                >
                  保存
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
