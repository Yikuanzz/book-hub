import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  FileType,
  BookType,
  X,
  Plus,
  BookOpen,
  Tag,
  Check,
  ChevronRight,
  AlertCircle,
  ImageIcon,
  Sparkles,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useBooksStore } from '../store/booksStore';
import { CoverCropper } from '../components/CoverCropper';

const supportedFormats = ['epub', 'pdf', 'mobi', 'txt'];
const defaultCategories = ['文学小说', '科技', '历史', '哲学', '心理学', '传记', '其他'];
const availableTags = [
  '经典', '现代', '科幻', '悬疑', '言情', '武侠',
  '诗歌', '散文', '编程', 'AI', '设计', '商业',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function getFileIcon(format: string) {
  switch (format) {
    case 'pdf': return <FileType size={28} className="text-red-500" />;
    case 'epub': return <BookType size={28} className="text-emerald-500" />;
    case 'mobi': return <BookOpen size={28} className="text-amber-500" />;
    default: return <FileText size={28} className="text-sky-500" />;
  }
}

function getFileColor(format: string): string {
  switch (format) {
    case 'pdf': return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900';
    case 'epub': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
    case 'mobi': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900';
    default: return 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900';
  }
}

// Deterministic gradient for default cover
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

export function Upload() {
  const navigate = useNavigate();
  const addBook = useStore((state) => state.addBook);
  const refreshStore = useStore((state) => state.refresh);
  const refreshBooks = useBooksStore((state) => state.refresh);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('文学小说');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Compute current step
  const step = !selectedFile ? 1 : (!title || !author) ? 2 : 3;

  // All categories including custom ones
  const allCategories = [...defaultCategories, ...customCategories.filter(c => !defaultCategories.includes(c))];

  const validate = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    if (!selectedFile) nextErrors.file = '请选择要上传的书籍文件';
    if (!title.trim()) nextErrors.title = '请输入书名';
    if (!author.trim()) nextErrors.author = '请输入作者';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [selectedFile, title, author]);

  useEffect(() => {
    if (Object.keys(touched).length > 0) validate();
  }, [touched, validate]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (supportedFormats.includes(ext)) {
      setSelectedFile(file);
      setErrors((prev) => { const n = { ...prev }; delete n.file; return n; });
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
      setTouched((prev) => ({ ...prev, title: true }));
    } else {
      setErrors((prev) => ({ ...prev, file: `不支持的格式 .${ext}，仅支持 ${supportedFormats.join('、')}` }));
      setTouched((prev) => ({ ...prev, file: true }));
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // ===== Cover Upload Handlers =====
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      e.target.value = '';
      return;
    }

    setIsUploadingCover(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImage(event.target?.result as string);
      setShowCropper(true);
      setIsUploadingCover(false);
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试');
      setIsUploadingCover(false);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleCoverDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setCoverDragActive(true);
    } else if (e.type === 'dragleave') {
      setCoverDragActive(false);
    }
  }, []);

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请拖拽图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    setIsUploadingCover(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImage(event.target?.result as string);
      setShowCropper(true);
      setIsUploadingCover(false);
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试');
      setIsUploadingCover(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeCustomCover = () => {
    setCustomCover(null);
  };

  const handleCropConfirm = (croppedImage: string) => {
    setCustomCover(croppedImage);
    setShowCropper(false);
    setCropImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImage(null);
  };

  // ===== Category Handlers =====
  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setCategory(trimmed);
    setNewCategoryInput('');
  };

  // ===== Tag Handlers =====
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/,$/, '');
      if (trimmed && !selectedTags.includes(trimmed)) {
        setSelectedTags((prev) => [...prev, trimmed]);
        setTagInput('');
      }
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      setSelectedTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ file: true, title: true, author: true });
    if (!validate()) return;
    if (!selectedFile || !title.trim() || !author.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalTime = 1800;
    const interval = 60;
    const steps = totalTime / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = Math.min(Math.round((current / steps) * 100), 95);
      setUploadProgress(progress);
      if (current >= steps) clearInterval(timer);
    }, interval);

    await new Promise((resolve) => setTimeout(resolve, totalTime));
    clearInterval(timer);
    setUploadProgress(100);

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() as 'epub' | 'pdf' | 'mobi' | 'txt' || 'epub';
    const book = await addBook({
      title: title.trim(),
      author: author.trim(),
      cover: customCover || '',
      category,
      totalPages: 300,
      format: ext,
      description: description.trim() || '暂无简介',
      tags: selectedTags,
    });

    // Upload file to server
    if (book?.id && selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        const res = await fetch(`/api/books/${book.id}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('File upload failed:', res.status, text);
        }
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    // Refresh stores to get updated filePath
    await refreshStore();
    await refreshBooks();

    setIsUploading(false);
    setUploadSuccess(true);

    setTimeout(() => {
      navigate('/library');
    }, 1200);
  };

  const fileExt = selectedFile ? (selectedFile.name.split('.').pop()?.toLowerCase() || 'txt') : '';

  return (
    <div className="max-w-3xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-display font-bold text-primary dark:text-white mb-2 tracking-tight">
          上传书籍
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          将你的电子书添加到个人书库，支持拖拽上传
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-[colors,shadow,transform] duration-300 ${
                step === s
                  ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/30'
                  : step > s
                  ? 'bg-accent/20 text-accent'
                  : 'bg-muted dark:bg-muted-dark text-gray-400'
              }`}
            >
              {step > s ? <Check size={16} /> : s}
            </div>
            <span
              className={`text-sm hidden sm:block transition-colors duration-300 ${
                step === s ? 'text-accent font-medium' : 'text-gray-400'
              }`}
            >
              {s === 1 ? '选择文件' : s === 2 ? '填写信息' : '完成上传'}
            </span>
            {s < 3 && (
              <ChevronRight
                size={16}
                className={`mx-1 transition-colors duration-300 ${
                  step > s ? 'text-accent' : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Cover Cropper */}
      {showCropper && cropImage && (
        <CoverCropper
          imageSrc={cropImage}
          onCrop={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Success Overlay */}
      {uploadSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm fade-in"
          aria-live="polite"
          role="status"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 text-center shadow-2xl scale-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-display font-bold text-primary dark:text-white mb-2">
              上传成功
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              《{title}》已添加到您的书库
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: File Upload */}
        <section
          className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-[colors,shadow,transform] duration-300 ${
            step === 1
              ? 'border-accent/40 shadow-lg shadow-accent/5'
              : 'border-border dark:border-border-dark'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                selectedFile ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-accent/10 text-accent'
              }`}>
                {selectedFile ? <Check size={18} /> : <UploadIcon size={18} />}
              </div>
              <h2 className="text-lg font-semibold text-primary dark:text-white">选择书籍文件</h2>
              {selectedFile && (
                <span className="ml-auto text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  已选择
                </span>
              )}
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl transition-[colors,shadow,transform] duration-300 overflow-hidden ${
                selectedFile
                  ? 'border-transparent bg-transparent'
                  : dragActive
                  ? 'border-accent bg-accent/[0.04] scale-[1.02]'
                  : 'border-border dark:border-border-dark hover:border-accent/40 hover:bg-accent/[0.02]'
              } ${!selectedFile ? 'cursor-pointer p-10' : ''}`}
            >
              {selectedFile ? (
                <div className={`rounded-xl p-5 border ${getFileColor(fileExt)} flex items-center gap-4`}>
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                    {getFileIcon(fileExt)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/30 font-medium uppercase">
                        {fileExt}
                      </span>
                    </div>
                    {isUploading && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-[colors,shadow,transform] duration-100"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setTitle('');
                        setErrors((prev) => { const n = { ...prev }; delete n.file; return n; });
                      }}
                      className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-[colors,shadow,transform] duration-300 ${
                    dragActive ? 'bg-accent/15 scale-110' : 'bg-muted dark:bg-muted-dark'
                  }`}>
                    <UploadIcon
                      size={32}
                      className={`transition-colors duration-300 ${
                        dragActive ? 'text-accent' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <p className="text-primary dark:text-white font-semibold text-lg mb-1">
                    {dragActive ? '释放以上传文件' : '拖拽文件到此处'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    或点击选择文件，支持 EPUB、PDF、MOBI、TXT 格式
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-dark transition-[colors,shadow,transform] active:scale-95"
                  >
                    <Plus size={18} />
                    选择文件
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".epub,.pdf,.mobi,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {touched.file && errors.file && (
              <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span>{errors.file}</span>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Book Info */}
        <section
          className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-[colors,shadow,transform] duration-300 ${
            step === 2
              ? 'border-accent/40 shadow-lg shadow-accent/5'
              : 'border-border dark:border-border-dark'
          } ${!selectedFile ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                title && author ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-accent/10 text-accent'
              }`}>
                {title && author ? <Check size={18} /> : <Sparkles size={18} />}
              </div>
              <h2 className="text-lg font-semibold text-primary dark:text-white">填写书籍信息</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cover Upload — no presets, buttons always visible */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-primary dark:text-white mb-2">
                  书籍封面
                </label>

                {/* Cover preview / upload area */}
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  onDragEnter={handleCoverDrag}
                  onDragLeave={handleCoverDrag}
                  onDragOver={handleCoverDrag}
                  onDrop={handleCoverDrop}
                  className={`w-full aspect-[3/4] rounded-xl overflow-hidden shadow-md border-2 transition-[border-color,transform] duration-300 ${
                    coverDragActive
                      ? 'border-accent bg-accent/[0.04] scale-[1.02]'
                      : customCover
                      ? 'border-transparent'
                      : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-accent'
                  }`}
                >
                  {customCover ? (
                    <img
                      src={customCover}
                      alt="封面预览"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${coverGradient(title)} flex flex-col items-center justify-center p-4`}>
                      <span className="text-white text-3xl font-bold drop-shadow-sm">
                        {(title || '书').slice(0, 2)}
                      </span>
                      {isUploadingCover && (
                        <Loader2 size={20} className="text-white/80 mt-2 animate-spin" />
                      )}
                    </div>
                  )}
                </button>

                {/* Action buttons — always visible, never hover-only */}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1"
                  >
                    <ImageIcon size={12} />
                    {customCover ? '更换封面' : '上传封面'}
                  </button>
                  {customCover && (
                    <button
                      type="button"
                      onClick={removeCustomCover}
                      className="py-1.5 px-2 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  )}
                </div>

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="md:col-span-2 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-white mb-2">
                    书名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    autoComplete="off"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                    placeholder="输入书籍名称"
                    className={`w-full px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-[box-shadow,background-color] duration-200 ${
                      touched.title && errors.title
                        ? 'ring-2 ring-red-500 focus:ring-red-500'
                        : 'focus:ring-accent'
                    }`}
                  />
                  {touched.title && errors.title && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.title}
                    </p>
                  )}
                </div>

                {/* Author */}
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-white mb-2">
                    作者 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="author"
                    autoComplete="off"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, author: true }))}
                    placeholder="输入作者姓名"
                    className={`w-full px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-[box-shadow,background-color] duration-200 ${
                      touched.author && errors.author
                        ? 'ring-2 ring-red-500 focus:ring-red-500'
                        : 'focus:ring-accent'
                    }`}
                  />
                  {touched.author && errors.author && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.author}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-white mb-2">
                    简介
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="输入书籍简介（选填）"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Category & Tags — direct chips + input */}
        <section
          className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-[colors,shadow,transform] duration-300 ${
            step === 3
              ? 'border-accent/40 shadow-lg shadow-accent/5'
              : 'border-border dark:border-border-dark'
          } ${!selectedFile ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <Tag size={18} />
              </div>
              <h2 className="text-lg font-semibold text-primary dark:text-white">分类与标签</h2>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary dark:text-white mb-3">
                分类 <span className="text-red-500">*</span>
              </label>

              {/* Category grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`h-10 flex items-center justify-center px-2 rounded-lg text-sm font-medium transition-[colors,shadow,transform] duration-200 ${
                      category === cat
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {category === cat && (
                      <Check size={14} className="shrink-0 mr-1" />
                    )}
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>

              {/* Inline custom category input */}
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
                  placeholder="没有合适分类？输入名称按回车添加"
                  maxLength={20}
                  className="w-full h-11 px-4 text-sm rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent transition-[colors,shadow,transform]"
                />
                {newCategoryInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-dark transition flex items-center"
                  >
                    添加
                  </button>
                )}
              </div>
            </div>

            {/* Tags — inline token input with suggestions */}
            <div>
              <label className="block text-sm font-medium text-primary dark:text-white mb-3">
                标签
              </label>

              {/* Tag input container — pills inline with input */}
              <div
                className={`min-h-[44px] px-3 py-1.5 rounded-xl bg-muted dark:bg-muted-dark border-0 flex flex-wrap items-center gap-2 transition-[colors,shadow,transform] ${
                  tagInput ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => {
                  const input = document.getElementById('tag-input') as HTMLInputElement;
                  input?.focus();
                }}
              >
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center h-8 gap-1 px-2.5 rounded-lg bg-accent/10 text-accent text-sm font-medium border border-accent/20 shrink-0"
                  >
                    <span className="truncate max-w-[100px]">{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="p-0.5 rounded-full hover:bg-accent/20 transition-colors shrink-0"
                      aria-label={`删除标签 ${tag}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  id="tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={selectedTags.length === 0 ? '输入标签，按回车或逗号添加' : ''}
                  maxLength={15}
                  className="flex-1 min-w-[120px] h-8 bg-transparent text-primary dark:text-white placeholder-gray-400 focus:outline-none text-sm"
                />
              </div>

              {/* Dynamic suggestions */}
              {tagInput.trim() && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {availableTags
                    .filter(
                      (t) =>
                        !selectedTags.includes(t) &&
                        t.toLowerCase().includes(tagInput.trim().toLowerCase())
                    )
                    .slice(0, 6)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) => [...prev, tag]);
                          setTagInput('');
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-accent/10 hover:text-accent dark:hover:bg-accent/20 dark:hover:text-accent transition-[colors,shadow,transform] duration-200 flex items-center"
                      >
                        + {tag}
                      </button>
                    ))}
                  {availableTags.filter(
                    (t) =>
                      !selectedTags.includes(t) &&
                      t.toLowerCase().includes(tagInput.trim().toLowerCase())
                  ).length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = tagInput.trim();
                        if (trimmed && !selectedTags.includes(trimmed)) {
                          setSelectedTags((prev) => [...prev, trimmed]);
                          setTagInput('');
                        }
                      }}
                      className="h-8 px-2.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-[colors,shadow,transform] flex items-center"
                    >
                      创建「{tagInput.trim()}」
                    </button>
                  )}
                </div>
              )}

              {/* Default suggestions when no input */}
              {!tagInput.trim() && availableTags.filter((t) => !selectedTags.includes(t)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400 mr-1 flex items-center h-8">建议：</span>
                  {availableTags
                    .filter((t) => !selectedTags.includes(t))
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-accent/10 hover:text-accent dark:hover:bg-accent/20 dark:hover:text-accent transition-[colors,shadow,transform] duration-200 flex items-center"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/library')}
            disabled={isUploading}
            className="sm:flex-1 py-3.5 px-6 bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-800 transition-[colors,shadow,transform] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!selectedFile || !title.trim() || !author.trim() || isUploading}
            className="sm:flex-[2] py-3.5 px-6 bg-accent text-white rounded-xl font-medium hover:bg-accent-dark transition-[colors,shadow,transform] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98]"
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                上传中 {uploadProgress > 0 ? `${uploadProgress}%` : '...'}
              </>
            ) : (
              <>
                <BookOpen size={20} />
                添加到书库
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
