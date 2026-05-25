import { ReactNode, useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Home,
  Clock,
  Library,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  LogOut,
  Upload,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isDarkMode = useStore((state) => state.isDarkMode);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Handle dark mode class application
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  // Handle window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/library', icon: Library, label: '书库' },
    { path: '/recent', icon: Clock, label: '最近阅读' },
    { path: '/notes', icon: BookOpen, label: '笔记' },
    { path: '/ai', icon: MessageSquare, label: 'AI 助手' },
    { path: '/settings', icon: Settings, label: '设置' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showText = sidebarOpen || isMobile;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } transition-all duration-300 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 overflow-hidden`}
      >
        <div className="h-full flex flex-col p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
              <BookOpen size={20} />
            </div>
            {showText && (
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                个人书库
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon size={20} />
                  {showText && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="space-y-1 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              onClick={() => navigate('/upload')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
            >
              <Upload size={20} />
              {showText && <span className="font-medium">上传书籍</span>}
            </button>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {showText && (
                <span className="font-medium">
                  {isDarkMode ? '亮色模式' : '暗色模式'}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <LogOut size={20} />
              {showText && <span className="font-medium">退出登录</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative hidden sm:block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="搜索书籍、笔记..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 lg:w-80 rounded-xl bg-gray-100 dark:bg-zinc-800 border-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
