import { useState } from 'react';
import {
  Moon,
  Sun,
  Database,
  Download,
  Trash2,
  Shield,
  Eye,
  Key,
  Book,
  Clock,
} from 'lucide-react';
import { useStore } from '../store/useStore';

export function Settings() {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const books = useStore((state) => state.books);
  const highlights = useStore((state) => state.highlights);
  const bookmarks = useStore((state) => state.bookmarks);
  const totalReadingTime = useStore((state) => state.totalReadingTime);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const formatReadingTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}`;
    }
    return `${mins}分钟`;
  };

  const handleExport = () => {
    const data = {
      books,
      highlights,
      bookmarks,
      totalReadingTime,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-library-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-primary dark:text-white mb-2">
          设置
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          管理你的个人书库偏好
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark mb-6">
        <h2 className="font-semibold text-primary dark:text-white mb-4 flex items-center gap-2">
          <Database size={20} />
          数据统计
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
            <div className="flex items-center gap-2 text-accent mb-1">
              <Book size={16} />
              <span className="text-2xl font-bold">{books.length}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">本书</p>
          </div>
          <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Clock size={16} />
              <span className="text-2xl font-bold">{formatReadingTime(totalReadingTime)}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">总阅读时长</p>
          </div>
          <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <Highlight size={16} />
              <span className="text-2xl font-bold">{highlights.length}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">条摘抄</p>
          </div>
          <div className="p-4 bg-muted dark:bg-muted-dark rounded-xl">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Bookmark size={16} />
              <span className="text-2xl font-bold">{bookmarks.length}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">个书签</p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark mb-6">
        <h2 className="font-semibold text-primary dark:text-white mb-4">外观</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <Moon size={20} className="text-accent" />
            ) : (
              <Sun size={20} className="text-accent" />
            )}
            <div>
              <p className="font-medium text-primary dark:text-white">深色模式</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isDarkMode ? '已启用深色主题' : '使用浅色主题'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              isDarkMode ? 'bg-accent' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isDarkMode ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark mb-6">
        <h2 className="font-semibold text-primary dark:text-white mb-4 flex items-center gap-2">
          <Shield size={20} />
          安全
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key size={20} className="text-gray-400" />
              <div>
                <p className="font-medium text-primary dark:text-white">访问密码</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  更改书库的访问密码
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-muted dark:bg-muted-dark text-accent rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              修改
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark mb-6">
        <h2 className="font-semibold text-primary dark:text-white mb-4 flex items-center gap-2">
          <Database size={20} />
          数据管理
        </h2>
        <div className="space-y-4">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 bg-muted dark:bg-muted-dark rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-accent" />
              <div className="text-left">
                <p className="font-medium text-primary dark:text-white">导出数据</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  导出所有书籍和笔记为 JSON 文件
                </p>
              </div>
            </div>
            {exportSuccess && (
              <span className="text-green-500 text-sm">✓ 已导出</span>
            )}
          </button>
          <button
            onClick={() => {
              if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
                localStorage.removeItem('book-hub-storage');
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-500" />
              <div className="text-left">
                <p className="font-medium text-red-600 dark:text-red-400">清除所有数据</p>
                <p className="text-sm text-red-400 dark:text-red-500">
                  重置书库为初始状态（不可恢复）
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-border-dark">
        <h2 className="font-semibold text-primary dark:text-white mb-4">关于</h2>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>个人书库 v1.0.0</p>
          <p>
            一个现代化的个人阅读管理应用，帮助你更好地管理和阅读电子书。
          </p>
          <p className="flex items-center gap-2">
            <Eye size={14} />
            设计风格参考：Modern Minimal / Swiss Style
          </p>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-primary dark:text-white mb-4">
              修改访问密码
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码"
                  className="w-full px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 px-4 bg-muted dark:bg-muted-dark text-gray-600 dark:text-gray-300 rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (newPassword && newPassword === confirmPassword) {
                      // In real app, update password in store
                      alert('密码修改成功！');
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    } else {
                      alert('两次输入的密码不一致');
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-accent text-white rounded-xl font-medium"
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
