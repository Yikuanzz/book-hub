import { useState, useMemo, createContext, useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { BookOpen, Home, Clock, Library, Settings, Sun, Moon, LogOut, Upload as UploadIcon, Search, Menu, X, BookMarked, Sparkles, Trash2, Download, Flame, TrendingUp, ArrowUp, ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Bookmark, StickyNote, Highlighter, Copy, MessageCircle, PanelRightOpen, PanelRightClose, MoreHorizontal, Filter, ChevronDown, Check, Edit3, Tag, Hash, RotateCcw, Quote, SlidersHorizontal, ArrowUpDown, Plus, Eye, EyeOff, Globe, Cpu, RefreshCw, Zap, Loader2, AlertCircle, CheckCircle2, CalendarDays, Ghost, RotateCw } from 'lucide-react';
import { useNotesStore } from './store/notesStore';
import type { ReaderHighlight, HighlightColor } from './store/notesStore';
import { useSettingsStore } from './store/settingsStore';
import type { AIProvider } from './store/settingsStore';
import { useAIChatStore, getBookChatMessages } from './store/aiChatStore';
import type { ChatMessage } from './store/aiChatStore';
import { useBooksStore } from './store/booksStore';
import type { LibraryBook } from './store/booksStore';
import { useStore } from './store/useStore';
import { EditBookModal } from './components/EditBookModal';
import { Upload } from './pages/Upload';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ============================================================
// Reading stats & chart helpers
// ============================================================

// Deterministic PRNG so the same date always yields the same minutes.
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Generate the past N days of reading minutes (stable across renders/sessions).
function buildReadingHistory(days = 365) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { date: Date; iso: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const rnd = seededRandom(seed);
    const dow = d.getDay();
    // Some days zero (rest days); weekends a touch higher.
    const zeroChance = dow === 0 || dow === 6 ? 0.18 : 0.32;
    const minutes = rnd() < zeroChance ? 0 : Math.round(rnd() * (dow === 0 || dow === 6 ? 120 : 75) + 5);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: new Date(d), iso, minutes });
  }
  return out;
}

// 5-level intensity bucket (0 = no activity).
function intensityLevel(min: number): 0 | 1 | 2 | 3 | 4 {
  if (min <= 0) return 0;
  if (min < 15) return 1;
  if (min < 35) return 2;
  if (min < 60) return 3;
  return 4;
}

// Tailwind classes per heatmap level (light + dark variants).
const HEATMAP_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'fill-gray-100 dark:fill-zinc-800',
  1: 'fill-emerald-200 dark:fill-emerald-900',
  2: 'fill-emerald-400 dark:fill-emerald-700',
  3: 'fill-emerald-500 dark:fill-emerald-500',
  4: 'fill-emerald-700 dark:fill-emerald-300',
};

// Simple auth context
const AuthContext = createContext<{
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

// Theme context
const ThemeContext = createContext<{
  isDarkMode: boolean;
  toggleTheme: () => void;
}>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Mock books data — moved to src/store/booksStore.ts
type ReadStatus = 'finished' | 'reading' | 'unread';

// helper: timestamps used to seed lastReadAt (deterministic offsets from "today")
const _h = 3600_000;
const _d = 86_400_000;
void _h; void _d; // referenced in booksStore seed; kept here for any future use

function readStatusOf(p: number): ReadStatus {
  if (p >= 100) return 'finished';
  if (p > 0) return 'reading';
  return 'unread';
}

const STATUS_LABEL: Record<ReadStatus, string> = {
  finished: '已读完',
  reading: '阅读中',
  unread: '未读',
};

const STATUS_BADGE: Record<ReadStatus, string> = {
  finished: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  reading:  'bg-blue-100    dark:bg-blue-900/40    text-blue-700    dark:text-blue-300',
  unread:   'bg-gray-100    dark:bg-zinc-800       text-gray-600    dark:text-gray-400',
};

// Deterministic accent gradient so each fallback cover has a distinct color
const COVER_GRADIENTS = [
  'from-rose-400    to-rose-600',
  'from-orange-400  to-orange-600',
  'from-amber-400   to-amber-600',
  'from-emerald-400 to-emerald-600',
  'from-cyan-400    to-cyan-600',
  'from-blue-400    to-blue-600',
  'from-violet-400  to-violet-600',
  'from-pink-400    to-pink-600',
];

function coverGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

function BookCover({
  src, title, className = '', sizes = '180px',
}: { src: string; title: string; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br ${coverGradient(title)} ${className} flex items-center justify-center text-white`}
        role="img"
        aria-label={`${title} 封面`}
      >
        <span className="font-display font-semibold text-2xl drop-shadow-sm">
          {title.slice(0, 2)}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${title} 封面`}
      loading="lazy"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

// Login Page
function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      navigate('/');
    } else {
      setError('密码错误');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 text-white mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            个人书库
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            输入密码以访问您的私人书库
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入密码 (123456)"
              />
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
            >
              进入书库
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const navigate = useNavigate();
  const mockBooks = useBooksStore((s) => s.books);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [heatmapRaw, setHeatmapRaw] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [dashRes, heatRes] = await Promise.all([
          fetch('/api/stats/dashboard'),
          fetch('/api/stats/heatmap?year=' + new Date().getFullYear()),
        ]);
        const dashJson = await dashRes.json();
        const heatJson = await heatRes.json();
        if (cancelled) return;
        if (dashJson.success) setDashboardStats(dashJson.data);
        if (heatJson.success) setHeatmapRaw(heatJson.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Build full-year history from backend heatmap data (fallback to mock if no data)
  const history = useMemo(() => {
    if (!loaded || heatmapRaw.length === 0) {
      return buildReadingHistory(365);
    }
    const minutesMap = new Map<string, number>();
    heatmapRaw.forEach((d: any) => minutesMap.set(d.date, d.minutes));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { date: Date; iso: string; minutes: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ date: new Date(d), iso, minutes: minutesMap.get(iso) || 0 });
    }
    return out;
  }, [heatmapRaw, loaded]);

  const last7 = useMemo(() => {
    if (dashboardStats?.weeklyReading?.length === 7) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dashboardStats.weeklyReading.map((minutes: number, i: number) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return { date: d, minutes };
      });
    }
    return history.slice(-7);
  }, [dashboardStats, history]);

  const last30 = useMemo(() => history.slice(-30), [history]);

  const totalHours = useMemo(() => {
    if (dashboardStats?.totalReadingTime != null) {
      return Math.round(dashboardStats.totalReadingTime / 60);
    }
    return Math.round(history.reduce((s, d) => s + d.minutes, 0) / 60);
  }, [dashboardStats, history]);

  const activeDays = useMemo(() => {
    if (heatmapRaw.length > 0) {
      return heatmapRaw.filter((d) => d.minutes > 0).length;
    }
    return history.filter((d) => d.minutes > 0).length;
  }, [heatmapRaw, history]);

  const streak = dashboardStats?.currentStreak ?? 0;

  const last7Avg = useMemo(() => {
    if (dashboardStats?.weeklyReading?.length === 7) {
      const total = dashboardStats.weeklyReading.reduce((s: number, m: number) => s + m, 0);
      return Math.round(total / 7);
    }
    const total = last7.reduce((s, d) => s + d.minutes, 0);
    return Math.round(total / 7);
  }, [dashboardStats, last7]);

  // Recent books: in-progress, sorted by lastReadAt (most recent first)
  const recentBooks = useMemo(
    () =>
      mockBooks
        .filter((b) => b.progress > 0 && b.progress < 100 && b.lastReadAt)
        .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0))
        .slice(0, 4),
    [mockBooks]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          欢迎回来
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          今天也是读书的好天气
        </p>
      </div>

      {/* Stat cards with sparkline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock size={18} className="text-blue-500" />}
          label="累计阅读"
          value={`${totalHours} 小时`}
          accent="bg-blue-50 dark:bg-blue-900/30"
          spark={last30.map((d) => d.minutes)}
          sparkColor="#3B82F6"
        />
        <StatCard
          icon={<BookOpen size={18} className="text-emerald-500" />}
          label="活跃天数"
          value={`${activeDays} 天`}
          accent="bg-emerald-50 dark:bg-emerald-900/30"
          spark={last30.map((d) => (d.minutes > 0 ? 1 : 0))}
          sparkColor="#10B981"
        />
        <StatCard
          icon={<Flame size={18} className="text-orange-500" />}
          label="连续阅读"
          value={`${streak} 天`}
          accent="bg-orange-50 dark:bg-orange-900/30"
          spark={last30.map((d) => d.minutes)}
          sparkColor="#F97316"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-purple-500" />}
          label="近 7 天均值"
          value={`${last7Avg} 分钟`}
          accent="bg-purple-50 dark:bg-purple-900/30"
          spark={last7.map((d) => d.minutes)}
          sparkColor="#A855F7"
        />
      </div>

      {/* Heatmap */}
      <ReadingHeatmap data={history} />

      {/* Weekly trend + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <WeeklyTrend data={last7} />
        </div>
        <div className="lg:col-span-2">
          <CategoryBreakdown data={dashboardStats?.categoryDistribution || []} />
        </div>
      </div>

      {/* Recent Books */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          继续阅读
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recentBooks.map(book => (
            <div
              key={book.id}
              onClick={() => navigate(`/reader/${book.id}`)}
              className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/5">
                <BookCover src={book.cover} title={book.title} className="w-full h-full" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white truncate">{book.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{book.author}</p>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${book.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 tabular-nums">{book.progress}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Chart sub-components (all hand-drawn SVG, no chart library)
// ============================================================

function StatCard({
  icon, label, value, accent, spark, sparkColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  spark: number[];
  sparkColor: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center`}>
          {icon}
        </div>
        <Sparkline values={spark} color={sparkColor} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 64;
  const h = 24;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const gid = `spark-${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReadingHeatmap({ data }: { data: { date: Date; iso: string; minutes: number }[] }) {
  // GitHub-style: columns are weeks, rows are weekdays (0=Sun..6=Sat).
  // Pad the leading week so the first column starts on Sunday.
  const padded: ({ date: Date; iso: string; minutes: number } | null)[] = [];
  const firstDow = data[0].date.getDay();
  for (let i = 0; i < firstDow; i++) padded.push(null);
  padded.push(...data);

  const weeks: ({ date: Date; iso: string; minutes: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Use a fixed viewBox; the SVG scales to its container via width="100%".
  const cell = 12;
  const gap = 3;
  const labelW = 24;
  const monthH = 16;
  const innerW = weeks.length * (cell + gap) - gap;
  const innerH = 7 * (cell + gap) - gap;
  const vbW = labelW + innerW;
  const vbH = monthH + innerH;

  // Month labels: place one at the first week whose label-month differs from previous.
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((wk, wi) => {
    const first = wk.find((d) => d !== null);
    if (!first) return;
    const m = first.date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ x: labelW + wi * (cell + gap), label: `${m + 1}月` });
      lastMonth = m;
    }
  });

  const total = data.reduce((s, d) => s + d.minutes, 0);
  const active = data.filter((d) => d.minutes > 0).length;

  return (
    <section
      aria-label="阅读热力图"
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-200 dark:border-zinc-800"
    >
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            过去一年的阅读
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            共 <span className="text-gray-900 dark:text-white font-medium tabular-nums">{Math.round(total / 60)}</span> 小时 ·
            <span className="ml-1 text-gray-900 dark:text-white font-medium tabular-nums">{active}</span> 天活跃
          </p>
        </div>
        <HeatmapLegend />
      </div>

      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="过去 365 天每日阅读时长"
        className="block"
      >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={11}
              className="fill-gray-500 dark:fill-gray-400"
              fontSize="10"
            >
              {m.label}
            </text>
          ))}
          {/* Weekday labels (Mon / Wed / Fri) */}
          {['一', '三', '五'].map((d, i) => (
            <text
              key={d}
              x={0}
              y={monthH + (1 + i * 2) * (cell + gap) + cell - 2}
              className="fill-gray-500 dark:fill-gray-400"
              fontSize="10"
            >
              {d}
            </text>
          ))}
          {/* Cells */}
          {weeks.map((wk, wi) =>
            wk.map((d, di) => {
              if (!d) return null;
              const lvl = intensityLevel(d.minutes);
              const x = labelW + wi * (cell + gap);
              const y = monthH + di * (cell + gap);
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={2}
                  ry={2}
                  className={`${HEATMAP_COLORS[lvl]} transition-colors`}
                >
                  <title>{`${d.iso} · ${d.minutes > 0 ? `${d.minutes} 分钟` : '未阅读'}`}</title>
                </rect>
              );
            })
          )}
      </svg>
    </section>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="mr-1">少</span>
      {([0, 1, 2, 3, 4] as const).map((lvl) => (
        <svg key={lvl} width={11} height={11} aria-hidden="true" className="block">
          <rect width={11} height={11} rx={2} ry={2} className={HEATMAP_COLORS[lvl]} />
        </svg>
      ))}
      <span className="ml-1">多</span>
    </div>
  );
}

function WeeklyTrend({ data }: { data: { date: Date; minutes: number }[] }) {
  const w = 360;
  const h = 180;
  const padL = 28;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const max = Math.max(60, ...data.map((d) => d.minutes));
  const barW = (innerW / data.length) * 0.55;
  const groupW = innerW / data.length;

  const dowLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const ticks = [0, Math.round(max / 2), max];

  return (
    <section
      aria-label="近 7 天阅读时长"
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 h-full"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            近 7 天阅读时长
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">单位：分钟</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="近 7 天每日阅读分钟数柱状图">
        {/* Grid + Y axis */}
        {ticks.map((t) => {
          const y = padT + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line
                x1={padL} y1={y} x2={w - padR} y2={y}
                className="stroke-gray-200 dark:stroke-zinc-800"
                strokeWidth="1"
              />
              <text
                x={padL - 6} y={y + 3}
                textAnchor="end"
                fontSize="10"
                className="fill-gray-400 dark:fill-gray-500"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + i * groupW + (groupW - barW) / 2;
          const barH = (d.minutes / max) * innerH;
          const y = padT + innerH - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                rx={4}
                className="fill-blue-500 dark:fill-blue-400 hover:fill-blue-600 dark:hover:fill-blue-300 transition-colors"
              >
                <title>{`${dowLabels[d.date.getDay()]} · ${d.minutes} 分钟`}</title>
              </rect>
              {/* Value label */}
              {d.minutes > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-gray-600 dark:fill-gray-300 tabular-nums"
                >
                  {d.minutes}
                </text>
              )}
              {/* X label */}
              <text
                x={x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                className="fill-gray-500 dark:fill-gray-400"
              >
                {dowLabels[d.date.getDay()]}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function CategoryBreakdown({ data }: { data: { name: string; count: number; color: string }[] }) {
  const cats = data.length > 0 ? data : [
    { name: '文学小说', count: 12, color: '#8B5CF6' },
    { name: '科技',     count: 8,  color: '#0EA5E9' },
    { name: '心理学',   count: 7,  color: '#10B981' },
    { name: '历史',     count: 6,  color: '#F59E0B' },
    { name: '哲学',     count: 5,  color: '#EF4444' },
    { name: '传记',     count: 4,  color: '#EC4899' },
  ];
  const max = Math.max(1, ...cats.map((c) => c.count));

  return (
    <section
      aria-label="书籍分类分布"
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 h-full"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        书库分类
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">按数量排序</p>

      {data.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">暂无分类数据</p>
      ) : (
        <ul className="space-y-3">
          {cats.map((c) => {
            const pct = (c.count / max) * 100;
            return (
              <li key={c.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">{c.count} 本</span>
                </div>
                <div
                  className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={c.count}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-label={`${c.name} 共 ${c.count} 本`}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Library Page
function LibraryPage() {
  const navigate = useNavigate();
  const mockBooks = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const deleteBook = useBooksStore((s) => s.deleteBook);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('全部');

  // Horizontal auto-scroll for category chips based on cursor proximity to edges.
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const chipOuterRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef<number>(0); // px per frame; sign = direction
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = chipScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  // Wire scroll state listeners.
  useEffect(() => {
    updateScrollState();
    const el = chipScrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  // Native mousemove listener on the outer container — guarantees we get every move.
  useEffect(() => {
    const outer = chipOuterRef.current;
    const scroller = chipScrollRef.current;
    if (!outer || !scroller) return;

    const tick = () => {
      const s = chipScrollRef.current;
      if (!s || speedRef.current === 0) {
        rafRef.current = null;
        return;
      }
      const max = s.scrollWidth - s.clientWidth;
      const next = s.scrollLeft + speedRef.current;
      const clamped = Math.max(0, Math.min(max, next));
      s.scrollLeft = clamped;
      if ((speedRef.current < 0 && clamped <= 0) || (speedRef.current > 0 && clamped >= max)) {
        speedRef.current = 0;
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = outer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const edge = 80;
      const maxSpeed = 12;
      let speed = 0;
      if (x < edge) {
        const t = 1 - x / edge;
        speed = -maxSpeed * t * t;
      } else if (x > rect.width - edge) {
        const t = 1 - (rect.width - x) / edge;
        speed = maxSpeed * t * t;
      }
      speedRef.current = speed;
      if (speed !== 0 && rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      speedRef.current = 0;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    outer.addEventListener('mousemove', onMove);
    outer.addEventListener('mouseleave', onLeave);
    return () => {
      outer.removeEventListener('mousemove', onMove);
      outer.removeEventListener('mouseleave', onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Available categories: derived from data, so adding new books JustWorks.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of mockBooks) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
    return [
      { name: '全部', count: mockBooks.length },
      ...[...counts.entries()].map(([name, count]) => ({ name, count })),
    ];
  }, [mockBooks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockBooks.filter((b) => {
      if (category !== '全部' && b.category !== category) return false;
      if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category, mockBooks]);

  // All unique category names (for the edit modal suggestions)
  const allCategoryNames = useMemo(
    () => [...new Set(mockBooks.map((b) => b.category))].sort((a, b) => a.localeCompare(b)),
    [mockBooks]
  );

  const clearAll = () => { setQuery(''); setCategory('全部'); };

  // Back-to-top button visibility (window scroll based).
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          我的书库
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          共 <span className="text-gray-900 dark:text-white font-medium tabular-nums">{mockBooks.length}</span> 本 ·
          <span className="ml-1">已显示 <span className="text-gray-900 dark:text-white font-medium tabular-nums">{filtered.length}</span> 本</span>
        </p>
      </div>

      {/* Toolbar: search + category chips, single unified band */}
      <div className="mb-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="relative w-full sm:w-72 shrink-0">
            <span className="sr-only">搜索书籍</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索书籍或作者..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition"
            />
          </label>

          {/* Category chips — horizontal scroll w/ edge-proximity auto scroll + fade masks */}
          <div ref={chipOuterRef} className="relative flex-1 min-w-0 flex items-center gap-2">
            {/* Fixed "分类" label outside the scroller */}
            <span className="text-[12px] text-gray-400 dark:text-gray-500 select-none shrink-0">分类</span>

            {/* Scrollable chips container */}
            <div className="relative flex-1 min-w-0">
              <div
                ref={chipScrollRef}
                role="group"
                aria-label="按分类筛选"
                className="flex flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {categories.map((c) => {
                  const active = category === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setCategory(c.name)}
                      aria-pressed={active}
                      className={
                        'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[13px] transition shrink-0 ' +
                        (active
                          ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/70 hover:text-gray-900 dark:hover:text-white')
                      }
                    >
                      <span className="whitespace-nowrap">{c.name}</span>
                      <span className={
                        'tabular-nums text-[11px] ' +
                        (active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')
                      }>{c.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Fade masks (decorative, non-interactive) */}
              {canScrollLeft && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10" aria-hidden="true" />
              )}
              {canScrollRight && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
          {filtered.map((book) => {
            const s = readStatusOf(book.progress);
            const menuOpen = menuOpenId === book.id;
            return (
              <li key={book.id}>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => navigate(`/reader/${book.id}`)}
                    className="w-full text-left focus:outline-none cursor-pointer"
                    aria-label={`打开《${book.title}》`}
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-blue-500 transition">
                      <BookCover
                        src={book.cover}
                        title={book.title}
                        className="w-full h-full group-hover:scale-[1.03] transition-transform duration-300"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                      />
                      {/* Progress chip top-right */}
                      {book.progress > 0 && book.progress < 100 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums bg-black/60 text-white backdrop-blur-sm">
                          {book.progress}%
                        </span>
                      )}
                      {book.progress >= 100 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500 text-white">
                          已读完
                        </span>
                      )}
                      {/* Bottom progress bar for in-progress */}
                      {book.progress > 0 && book.progress < 100 && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Text block: tight title+author group, separated meta row */}
                    <div className="mt-3">
                      <h3
                        className="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white line-clamp-1"
                        title={book.title}
                      >
                        {book.title}
                      </h3>
                      <p
                        className="mt-1 text-[13px] leading-snug text-gray-500 dark:text-gray-400 line-clamp-1"
                        title={book.author}
                      >
                        {book.author}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_BADGE[s]}`}>
                          {STATUS_LABEL[s]}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate" title={book.category}>
                          {book.category}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* "More" button — appears on card hover; click stops propagation */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpen ? null : book.id);
                    }}
                    aria-label={`${book.title} 更多操作`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className={`absolute top-2 left-2 grid place-items-center h-7 w-7 rounded-lg bg-black/60 text-white backdrop-blur-sm transition ${
                      menuOpen
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                    } hover:bg-black/80`}
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {/* Action menu */}
                  {menuOpen && (
                    <>
                      {/* Backdrop to dismiss */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div
                        role="menu"
                        className="absolute top-10 left-2 z-50 min-w-[140px] py-1 rounded-lg bg-white dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/10 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setEditingBook(book);
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center gap-2"
                        >
                          <Edit3 size={13} />
                          编辑信息
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            if (confirm(`确定删除《${book.title}》吗？此操作不可撤销。`)) {
                              deleteBook(book.id);
                            }
                            setMenuOpenId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" aria-hidden="true" />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">没有匹配的书籍</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            试试调整筛选条件或搜索其他关键词
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
          >
            清空筛选
          </button>
        </div>
      )}

      {/* Back to top floating button */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="回到顶部"
        title="回到顶部"
        className={
          'fixed bottom-6 right-6 z-40 grid place-items-center h-11 w-11 rounded-full bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 shadow-lg ring-1 ring-black/5 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:-translate-y-0.5 transition ' +
          (showBackToTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-2')
        }
      >
        <ArrowUp size={18} />
      </button>

      {/* Edit Book Modal */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          allCategories={allCategoryNames}
          onSave={(patch) => updateBook(editingBook.id, patch)}
          onDelete={() => deleteBook(editingBook.id)}
          onClose={() => setEditingBook(null)}
        />
      )}
    </div>
  );
}

// Reader Page
type ReaderSideTab = 'bookmarks' | 'notes' | 'ai';
interface ReaderBookmark { id: string; page: number; label: string; createdAt: number }

function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mockBooks = useBooksStore((s) => s.books);
  const book = mockBooks.find((b) => b.id === id);

  // Reader state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [sideOpen, setSideOpen] = useState<boolean>(true);
  const [sideTab, setSideTab] = useState<ReaderSideTab>('bookmarks');
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const allHighlights = useNotesStore((s) => s.highlights);
  const addHighlight = useNotesStore((s) => s.add);
  const updateHighlight = useNotesStore((s) => s.update);
  const removeHighlight = useNotesStore((s) => s.remove);
  const highlights = useMemo(
    () => allHighlights.filter((h) => h.bookId === (book?.id ?? '')),
    [allHighlights, book?.id]
  );
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [popover, setPopover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>('1');
  const [noteEditor, setNoteEditor] = useState<
    | null
    | {
        mode: 'create';
        text: string;
        page: number;
      }
    | {
        mode: 'edit';
        id: string;
      }
  >(null);

  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // sync pageInput when pageNumber changes via buttons
  useEffect(() => { setPageInput(String(pageNumber)); }, [pageNumber]);

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // selection popover
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const onUp = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!text || !sel || sel.rangeCount === 0) { setPopover(null); return; }
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer as Node;
      const el = node.nodeType === 1 ? (node as Element) : (node.parentElement as Element | null);
      if (!el || !wrap.contains(el)) { setPopover(null); return; }
      const rect = range.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2 - wrapRect.left,
        y: rect.top - wrapRect.top - 8,
        text,
      });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-selection-popover]')) return;
      setPopover(null);
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  if (!book) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <BookOpen size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" aria-hidden="true" />
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">书籍不存在</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">未找到 id 为 {id} 的书籍</p>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
        >
          返回书库
        </button>
      </div>
    );
  }

  const isPdf = book.format === 'pdf' && !!book.file;
  const progressPct = numPages > 0 ? Math.round((pageNumber / numPages) * 100) : book.progress;

  // actions
  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () => setPageNumber((p) => Math.min(numPages || p, p + 1));
  const submitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (Number.isFinite(n) && n >= 1 && n <= (numPages || n)) setPageNumber(n);
    else setPageInput(String(pageNumber));
  };
  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)));

  const addBookmarkHere = () => {
    if (bookmarks.some((b) => b.page === pageNumber)) {
      setToast(`第 ${pageNumber} 页已在书签中`);
      return;
    }
    setBookmarks((prev) => [
      { id: `${Date.now()}`, page: pageNumber, label: `第 ${pageNumber} 页`, createdAt: Date.now() },
      ...prev,
    ]);
    setToast(`已添加书签：第 ${pageNumber} 页`);
    setSideOpen(true);
    setSideTab('bookmarks');
  };
  const removeBookmark = (bid: string) => setBookmarks((prev) => prev.filter((b) => b.id !== bid));

  const onHighlight = () => {
    if (!popover || !book) return;
    addHighlight({
      bookId: book.id,
      bookTitle: book.title,
      page: pageNumber,
      text: popover.text,
      tags: [],
      color: 'yellow',
    });
    setToast('已高亮');
    setPopover(null);
    setSideOpen(true);
    setSideTab('notes');
    window.getSelection()?.removeAllRanges();
  };
  const onAddNote = () => {
    if (!popover) return;
    setNoteEditor({ mode: 'create', text: popover.text, page: pageNumber });
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };
  const onCopy = async () => {
    if (!popover) return;
    try {
      await navigator.clipboard.writeText(popover.text);
      setToast('已复制到剪贴板');
    } catch {
      setToast('复制失败');
    }
    setPopover(null);
  };
  const addAiMessage = useAIChatStore((s) => s.addMessage);
  const startNewAiConv = useAIChatStore((s) => s.startNewConversation);
  const bookChatMessages = useAIChatStore((s) => (book ? getBookChatMessages(s, book.id) : []));

  const handleAskAIWithText = (userText: string, pageRef?: number) => {
    if (!book) return;
    addAiMessage(book.id, 'user', userText);
    setAiLoading(true);
    // Mock AI response after delay
    setTimeout(() => {
      const mockResponse =
        pageRef === undefined
          ? `好的，关于这个问题，我建议你可以从以下角度思考：1）上下文语境；2）作者风格；3）社会背景。当前阅读《${book.title}》。`
          : `关于第 ${pageRef} 页的这段文字，我的分析：\n\n这段内容体现了作者的叙事技巧，建议结合前文进行理解。`;
      addAiMessage(book.id, 'assistant', mockResponse);
      setAiLoading(false);
    }, 800);
  };

  const onAskAI = () => {
    if (!popover) return;
    const text = popover.text;
    handleAskAIWithText(`（P.${pageNumber}）${text}`, pageNumber);
    setSideOpen(true);
    setSideTab('ai');
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };
  const onExplain = () => {
    if (!popover) return;
    handleAskAIWithText(`请解释这段：${popover.text}`, pageNumber);
    setSideOpen(true);
    setSideTab('ai');
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const sendAi = () => {
    const t = aiInput.trim();
    if (!t || !book) return;
    handleAskAIWithText(t);
    setAiInput('');
  };

  const handleNewChat = () => {
    if (!book) return;
    startNewAiConv(book.id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-1 mb-3">
        <button
          type="button"
          onClick={() => navigate('/library')}
          aria-label="返回书库"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={book.title}>
            {book.title}
          </h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
            {book.author}
            {book.format && <span className="ml-2 uppercase tracking-wide text-[11px] text-gray-400">{book.format}</span>}
          </p>
        </div>
        <span className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
          进度 {progressPct}%
        </span>
        <button
          type="button"
          onClick={() => setSideOpen((v) => !v)}
          aria-label={sideOpen ? '收起侧栏' : '展开侧栏'}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          title={sideOpen ? '收起侧栏' : '展开侧栏'}
        >
          {sideOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>

      {/* Main reader area */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* PDF canvas */}
        <div className="flex-1 min-w-0 flex flex-col rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div
            ref={canvasWrapRef}
            className="relative flex-1 min-h-0 overflow-auto flex justify-center py-6"
          >
            {isPdf ? (
              <Document
                file={book.file}
                onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPageNumber((p) => Math.min(p, n)); }}
                loading={<div className="text-sm text-gray-500 dark:text-gray-400 py-10">正在加载 PDF…</div>}
                error={<div className="text-sm text-red-500 py-10">PDF 加载失败</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-md bg-white"
                />
              </Document>
            ) : (
              <div className="grid place-items-center w-full h-full text-center px-8">
                <div>
                  <BookOpen size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" aria-hidden="true" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">该格式暂未实现阅读器</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">当前书籍格式：{book.format || '未知'}</p>
                </div>
              </div>
            )}

            {/* Selection popover */}
            {popover && (
              <div
                data-selection-popover
                style={{ left: popover.x, top: popover.y, transform: 'translate(-50%, -100%)' }}
                className="absolute z-30 flex items-center gap-0.5 rounded-lg bg-zinc-900 text-white shadow-lg px-1 py-1"
              >
                <PopoverBtn onClick={onHighlight} icon={<Highlighter size={14} />} label="高亮" />
                <PopoverBtn onClick={onCopy} icon={<Copy size={14} />} label="复制" />
                <PopoverBtn onClick={onAddNote} icon={<StickyNote size={14} />} label="笔记" />
                <PopoverBtn onClick={onAskAI} icon={<Sparkles size={14} />} label="问 AI" />
                <PopoverBtn onClick={onExplain} icon={<MessageCircle size={14} />} label="解释" />
              </div>
            )}

            {/* Click-to-flip edge zones (only when PDF is loaded) */}
            {isPdf && numPages > 0 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={pageNumber <= 1}
                  aria-label="上一页"
                  title="点击上一页"
                  className="group absolute left-0 top-0 bottom-0 w-[10%] max-w-[80px] z-10 flex items-center justify-start pl-2 cursor-pointer disabled:cursor-default disabled:opacity-0 focus:outline-none"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 grid place-items-center h-10 w-10 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur shadow text-gray-700 dark:text-gray-200">
                    <ChevronLeft size={20} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={pageNumber >= numPages}
                  aria-label="下一页"
                  title="点击下一页"
                  className="group absolute right-0 top-0 bottom-0 w-[10%] max-w-[80px] z-10 flex items-center justify-end pr-2 cursor-pointer disabled:cursor-default disabled:opacity-0 focus:outline-none"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 grid place-items-center h-10 w-10 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur shadow text-gray-700 dark:text-gray-200">
                    <ChevronRight size={20} />
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Bottom toolbar */}
          {isPdf && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur">
              <div className="flex items-center gap-1">
                <ToolbarBtn onClick={goPrev} disabled={pageNumber <= 1} icon={<ChevronLeft size={16} />} label="上一页" />
                <form
                  onSubmit={(e) => { e.preventDefault(); submitPageInput(); }}
                  className="flex items-center gap-1 text-[12px] text-gray-600 dark:text-gray-300 px-1"
                >
                  <input
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                    onBlur={submitPageInput}
                    className="w-12 h-7 text-center rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    aria-label="跳转到页码"
                  />
                  <span className="tabular-nums">/ {numPages || '–'}</span>
                </form>
                <ToolbarBtn onClick={goNext} disabled={!!numPages && pageNumber >= numPages} icon={<ChevronRight size={16} />} label="下一页" />
              </div>
              <div className="flex items-center gap-1">
                <ToolbarBtn onClick={zoomOut} disabled={scale <= 0.5} icon={<ZoomOut size={16} />} label="缩小" />
                <span className="text-[12px] text-gray-600 dark:text-gray-300 tabular-nums w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <ToolbarBtn onClick={zoomIn} disabled={scale >= 3} icon={<ZoomIn size={16} />} label="放大" />
                <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-zinc-700" />
                <ToolbarBtn
                  onClick={addBookmarkHere}
                  icon={<Bookmark size={16} className={bookmarks.some((b) => b.page === pageNumber) ? 'fill-current' : ''} />}
                  label="加书签"
                />
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {sideOpen && (
          <aside className="w-80 shrink-0 hidden md:flex flex-col rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center border-b border-gray-200 dark:border-zinc-800">
              <SideTab active={sideTab === 'bookmarks'} onClick={() => setSideTab('bookmarks')} icon={<Bookmark size={14} />} label="书签" count={bookmarks.length} />
              <SideTab active={sideTab === 'notes'} onClick={() => setSideTab('notes')} icon={<StickyNote size={14} />} label="笔记" count={highlights.length} />
              <SideTab active={sideTab === 'ai'} onClick={() => setSideTab('ai')} icon={<Sparkles size={14} />} label="AI" />
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              {sideTab === 'bookmarks' && (
                <div className="p-3 space-y-2">
                  {bookmarks.length === 0 ? (
                    <EmptyHint icon={<Bookmark size={20} />} text="还没有书签" subtext="点击底部书签按钮，标记当前页" />
                  ) : (
                    bookmarks.map((b) => (
                      <div key={b.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition">
                        <button
                          type="button"
                          onClick={() => setPageNumber(b.page)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{b.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">{new Date(b.createdAt).toLocaleString()}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBookmark(b.id)}
                          aria-label="删除书签"
                          className="opacity-0 group-hover:opacity-100 transition p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {sideTab === 'notes' && (
                <div className="p-3 space-y-2">
                  {highlights.length === 0 ? (
                    <EmptyHint icon={<StickyNote size={20} />} text="还没有笔记或高亮" subtext="在正文中选中文字，从浮窗中操作" />
                  ) : (
                    highlights.map((h) => (
                      <div key={h.id} className="group relative p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition">
                        <button
                          type="button"
                          onClick={() => setPageNumber(h.page)}
                          className="absolute inset-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                          aria-label={`跳转到第 ${h.page} 页`}
                        />
                        <div className="relative pointer-events-none">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">P.{h.page} · {new Date(h.updatedAt).toLocaleDateString()}</div>
                            <span className={`h-2 w-2 rounded-full ${HIGHLIGHT_DOT[h.color]}`} aria-hidden="true" />
                          </div>
                          <div className={`text-[13px] text-gray-800 dark:text-gray-100 ${HIGHLIGHT_BG[h.color]} px-1.5 py-1 rounded leading-relaxed`}>“{h.text}”</div>
                          {h.note && <div className="mt-1.5 text-[12px] text-gray-600 dark:text-gray-300 italic leading-relaxed">{h.note}</div>}
                          {h.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {h.tags.map((t) => (
                                <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800">
                                  <Hash size={9} />{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setNoteEditor({ mode: 'edit', id: h.id }); }}
                            aria-label="编辑笔记"
                            className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeHighlight(h.id); setToast('已删除笔记'); }}
                            aria-label="删除笔记"
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {sideTab === 'ai' && (
                <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800/60 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI 助手</span>
                    </div>
                    <button
                      onClick={handleNewChat}
                      disabled={bookChatMessages.length === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="新对话"
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>

                  {/* Chat area */}
                  <div ref={(el) => el?.lastElementChild?.scrollIntoView({ behavior: 'smooth' })} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
                    {bookChatMessages.length === 0 ? (
                      <>
                        {/* Empty state - Gemini style */}
                        <div className="text-center py-8">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                            <Sparkles size={24} className="text-white" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">阅读 AI 助手</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto">
                            选中正文 → 解释、总结、提问
                          </p>
                        </div>
                      </>
                    ) : (
                      bookChatMessages.map((m) => (
                        <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {/* AI avatar */}
                          {m.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow shadow-indigo-500/20">
                              <Sparkles size={12} className="text-white" />
                            </div>
                          )}
                          {/* Bubble */}
                          <div
                            className={`max-w-[240px] text-[13px] leading-relaxed px-3.5 py-2.5 break-words whitespace-pre-wrap ${
                              m.role === 'user'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow shadow-blue-500/20'
                                : 'bg-gray-100 dark:bg-zinc-800/80 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))
                    )}
                    {/* Typing indicator */}
                    {aiLoading && (
                      <div className="flex gap-2.5 justify-start">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow shadow-indigo-500/20">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-zinc-800/80 rounded-2xl rounded-bl-md px-3.5 py-3">
                          <div className="flex gap-1 items-center h-4">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce opacity-60"
                                style={{ animationDelay: `${i * 100}ms`, animationDuration: '0.8s' }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Anchor for auto-scroll */}
                    <div />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendAi(); }}
                    className="p-3 border-t border-gray-100 dark:border-zinc-800/60 shrink-0"
                  >
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 rounded-full border border-gray-200 dark:border-zinc-700/80 px-3 py-1.5 focus-within:border-blue-400/60 dark:focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-400/20 transition">
                      <input
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="输入问题…"
                        className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!aiInput.trim() || aiLoading}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-zinc-600 dark:disabled:to-zinc-700 text-white disabled:cursor-not-allowed transition shadow shadow-blue-500/20 disabled:shadow-none"
                      >
                        <Zap size={14} />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-zinc-900 text-white text-[13px] shadow-lg fade-in" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* Note editor modal */}
      {noteEditor && book && (
        <NoteEditorModal
          mode={noteEditor.mode}
          initial={
            noteEditor.mode === 'edit'
              ? allHighlights.find((h) => h.id === noteEditor.id)
              : { text: noteEditor.text, page: noteEditor.page, bookTitle: book.title }
          }
          onClose={() => setNoteEditor(null)}
          onSave={(data) => {
            if (noteEditor.mode === 'edit') {
              updateHighlight(noteEditor.id, data);
              setToast('已更新笔记');
            } else {
              addHighlight({
                bookId: book.id,
                bookTitle: book.title,
                page: noteEditor.page,
                text: noteEditor.text,
                note: data.note ?? '',
                tags: data.tags ?? [],
                color: data.color ?? 'yellow',
              });
              setToast('已添加笔记');
              setSideOpen(true);
              setSideTab('notes');
            }
            setNoteEditor(null);
          }}
        />
      )}
    </div>
  );
}

// Highlight color tokens (shared by Reader sidebar + NoteEditor + NotesPage)
const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];
const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-100/70 dark:bg-yellow-300/15',
  green: 'bg-green-100/70 dark:bg-green-300/15',
  blue: 'bg-blue-100/70 dark:bg-blue-300/15',
  pink: 'bg-pink-100/70 dark:bg-pink-300/15',
};
const HIGHLIGHT_DOT: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  pink: 'bg-pink-500',
};
const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
  pink: '粉色',
};

interface NoteEditorInitial {
  text?: string;
  page?: number;
  bookTitle?: string;
  note?: string;
  tags?: string[];
  color?: HighlightColor;
}

function NoteEditorModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  initial?: NoteEditorInitial | ReaderHighlight;
  onClose: () => void;
  onSave: (data: { note: string; tags: string[]; color: HighlightColor }) => void;
}) {
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [color, setColor] = useState<HighlightColor>(initial?.color ?? 'yellow');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSave({ note: note.trim(), tags, color });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onSave, note, tags, color]);

  const dirty = useMemo(() => {
    if (mode === 'create') return note.trim().length > 0 || tags.length > 0;
    return (
      (initial?.note ?? '') !== note ||
      JSON.stringify(initial?.tags ?? []) !== JSON.stringify(tags) ||
      (initial?.color ?? 'yellow') !== color
    );
  }, [mode, initial, note, tags, color]);

  const attemptClose = () => {
    if (dirty && !window.confirm('有未保存的修改，确定要关闭吗？')) return;
    onClose();
  };

  const commitTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) attemptClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? '添加笔记' : '编辑笔记'}
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl slide-up overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? '添加笔记' : '编辑笔记'}
            </h2>
            {(initial?.bookTitle || initial?.page) && (
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                {initial?.bookTitle && <span>{initial.bookTitle}</span>}
                {initial?.page && <span className="ml-2 tabular-nums">P.{initial.page}</span>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="关闭"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Quoted text */}
          {initial?.text && (
            <div className="relative">
              <div className={`text-[13px] leading-relaxed ${HIGHLIGHT_BG[color]} text-gray-800 dark:text-gray-100 rounded-lg p-3 pl-8`}>
                <Quote size={14} className="absolute left-2.5 top-3 text-gray-400" aria-hidden="true" />
                {initial.text}
              </div>
            </div>
          )}

          {/* Note textarea */}
          <div>
            <label htmlFor="note-content" className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              笔记内容
            </label>
            <textarea
              id="note-content"
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="写下你的想法、感悟、疑问…"
              className="w-full px-3 py-2 text-[14px] leading-relaxed rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none"
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">⌘/Ctrl + Enter 保存</p>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="note-tag" className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <Tag size={12} /> 标签
            </label>
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus-within:ring-2 focus-within:ring-blue-400/40">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-[12px] bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200">
                  <Hash size={10} />{t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    aria-label={`删除标签 ${t}`}
                    className="inline-flex items-center justify-center h-4 w-4 rounded text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-600"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="note-tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
                    e.preventDefault();
                    commitTag();
                  } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={commitTag}
                placeholder={tags.length === 0 ? '回车或逗号添加标签' : ''}
                className="flex-1 min-w-[100px] text-[13px] bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">高亮颜色</label>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="高亮颜色">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={HIGHLIGHT_LABEL[c]}
                  onClick={() => setColor(c)}
                  className={`relative h-8 w-8 rounded-full ${HIGHLIGHT_DOT[c]} transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 dark:focus:ring-offset-zinc-900 ${color === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-zinc-900' : 'hover:scale-110'}`}
                >
                  {color === c && <Check size={14} className="absolute inset-0 m-auto text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/60">
          <button
            type="button"
            onClick={attemptClose}
            className="px-3 h-9 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave({ note: note.trim(), tags, color })}
            className="px-4 h-9 rounded-lg text-[13px] font-medium bg-blue-500 hover:bg-blue-600 text-white transition shadow-sm"
          >
            {mode === 'create' ? '添加' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PopoverBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] hover:bg-white/10 transition"
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolbarBtn({ onClick, disabled, icon, label }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {icon}
    </button>
  );
}

function SideTab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 h-10 text-[13px] font-medium border-b-2 transition ${active ? 'border-blue-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="ml-0.5 text-[11px] tabular-nums text-gray-400">({count})</span>
      )}
    </button>
  );
}

function EmptyHint({ icon, text, subtext }: { icon: React.ReactNode; text: string; subtext?: string }) {
  return (
    <div className="py-10 text-center text-gray-400 dark:text-gray-500">
      <div className="mx-auto mb-2 grid place-items-center h-10 w-10 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400">{icon}</div>
      <div className="text-[13px] text-gray-600 dark:text-gray-300">{text}</div>
      {subtext && <div className="text-[12px] mt-1">{subtext}</div>}
    </div>
  );
}

// Recent Page
function RecentPage() {
  const navigate = useNavigate();
  const mockBooks = useBooksStore((s) => s.books);
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ today: true, thisWeek: true, thisMonth: false, forgotten: false });

  const now = Date.now();
  const _h = 3600_000;
  const _d = 86_400_000;

  const timeGroups = useMemo(() => {
    const reading = mockBooks.filter((b) => b.progress > 0 && b.progress < 100);

    const groups: Record<string, LibraryBook[]> = {
      today: [], thisWeek: [], thisMonth: [], forgotten: [],
    };
    const labels: Record<string, string> = {
      today: '今天', thisWeek: '本周内', thisMonth: '本月', forgotten: '被遗忘',
    };
    const icons: Record<string, { Icon: typeof Sun; color: string }> = {
      today:     { Icon: Sun,          color: 'text-amber-500' },
      thisWeek:  { Icon: BookOpen,     color: 'text-blue-500' },
      thisMonth: { Icon: CalendarDays, color: 'text-violet-500' },
      forgotten: { Icon: Ghost,        color: 'text-gray-400 dark:text-gray-500' },
    };

    reading.forEach((b) => {
      const age = now - (b.lastReadAt ?? 0);
      if (age < 24 * _h) groups.today.push(b);
      else if (age < 7 * _d) groups.thisWeek.push(b);
      else if (age < 30 * _d) groups.thisMonth.push(b);
      else groups.forgotten.push(b);
    });

    // sort each group by recency (newest first)
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0));
    }

    return { groups, labels, icons, total: reading.length };
  }, [now, mockBooks]);

  // search filter
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return timeGroups.groups;
    const q = search.trim().toLowerCase();
    const result: Record<string, LibraryBook[]> = {};
    for (const [k, list] of Object.entries(timeGroups.groups)) {
      result[k] = list.filter((b) =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [timeGroups.groups, search]);

  const toggleSection = (k: string) => {
    setOpenSections((p) => ({ ...p, [k]: !p[k] }));
  };

  const BookCard = ({ book }: { book: LibraryBook }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 flex items-center gap-4">
      <div className="w-14 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/5">
        <BookCover src={book.cover} title={book.title} className="w-full h-full" sizes="56px" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">{book.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
        <div className="mt-2 w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${book.progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 tabular-nums">
          {book.progress}% {formatRelativeAge(now - (book.lastReadAt ?? 0))}
        </p>
      </div>
      <button
        onClick={() => navigate(`/reader/${book.id}`)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shrink-0"
      >
        继续阅读
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">在读</h1>
        {timeGroups.total >= 8 && (
          <input
            type="text"
            placeholder="搜索书名或作者…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div className="space-y-3">
        {(['today', 'thisWeek', 'thisMonth', 'forgotten'] as const).map((k) => {
          const list = filteredGroups[k];
          if (!list.length) return null;
          const isOpen = openSections[k];
          const { Icon, color } = timeGroups.icons[k];

          return (
            <div key={k}>
              <button
                onClick={() => toggleSection(k)}
                className="w-full flex items-center justify-between px-1 py-2 mb-2 text-left group"
              >
                <span className="flex items-center gap-2">
                  <Icon size={16} className={color} strokeWidth={2} />
                  <span className="font-medium text-gray-900 dark:text-white">{timeGroups.labels[k]}</span>
                  {list.length > 1 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 tabular-nums">
                      {list.length}本
                    </span>
                  )}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="space-y-3 pb-1">
                    {list.map((b) => (
                      <BookCard key={b.id} book={b} />
                    ))}
                    {k === 'forgotten' && (
                      <p className="px-2 text-sm italic text-gray-400 dark:text-gray-500">
                        是不是把我遗忘了？回去翻一翻吧 🏃‍♂️
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {timeGroups.total === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
              开始你的第一本书吧
            </p>
            <p className="text-gray-400 text-sm">
              打开书库，选择一本书，开始阅读之旅
            </p>
            <button
              onClick={() => navigate('/library')}
              className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              去书库
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 人性化格式化：x小时前/x天前
function formatRelativeAge(ms: number): string {
  const hours = Math.round(ms / 3600_000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `· ${hours}小时前`;
  const days = Math.round(hours / 24);
  return `· ${days}天前`;
}

// Notes Page
type NotesSort = 'newest' | 'oldest' | 'book';
const SORT_LABEL: Record<NotesSort, string> = { newest: '最新', oldest: '最早', book: '按书名' };

function NotesPage() {
  const navigate = useNavigate();
  const highlights = useNotesStore((s) => s.highlights);
  const removeHl = useNotesStore((s) => s.remove);
  const restoreHl = useNotesStore((s) => s.restore);
  const updateHl = useNotesStore((s) => s.update);

  const [q, setQ] = useState<string>('');
  const [bookFilter, setBookFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<HighlightColor[]>([]);
  const [onlyWithNote, setOnlyWithNote] = useState<boolean>(false);
  const [sort, setSort] = useState<NotesSort>('newest');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [sortOpen, setSortOpen] = useState<boolean>(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{ msg: string; item: ReaderHighlight } | null>(null);

  // close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-note-menu]')) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  // undo toast auto-dismiss
  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(() => setUndoToast(null), 5000);
    return () => clearTimeout(t);
  }, [undoToast]);

  // Derived: books and tags with counts (counts反映全量, 不按当前筛选)
  const bookList = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    highlights.forEach((h) => {
      const existing = map.get(h.bookId);
      if (existing) existing.count += 1;
      else map.set(h.bookId, { title: h.bookTitle, count: 1 });
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, title: v.title, count: v.count })).sort((a, b) => b.count - a.count);
  }, [highlights]);

  const tagList = useMemo(() => {
    const map = new Map<string, number>();
    highlights.forEach((h) => h.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [highlights]);

  const colorCounts = useMemo(() => {
    const m: Record<HighlightColor, number> = { yellow: 0, green: 0, blue: 0, pink: 0 };
    highlights.forEach((h) => { m[h.color] += 1; });
    return m;
  }, [highlights]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    let out = highlights.filter((h) => {
      if (bookFilter.length && !bookFilter.includes(h.bookId)) return false;
      if (colorFilter.length && !colorFilter.includes(h.color)) return false;
      if (onlyWithNote && !(h.note && h.note.trim())) return false;
      if (tagFilter.length > 0 && !tagFilter.every((t) => h.tags.includes(t))) return false;
      if (qLower) {
        const haystack = `${h.text} ${h.note ?? ''} ${h.tags.join(' ')} ${h.bookTitle}`.toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }
      return true;
    });
    if (sort === 'newest') out = [...out].sort((a, b) => b.updatedAt - a.updatedAt);
    else if (sort === 'oldest') out = [...out].sort((a, b) => a.updatedAt - b.updatedAt);
    else if (sort === 'book') out = [...out].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle, 'zh') || b.page - a.page);
    return out;
  }, [highlights, q, bookFilter, tagFilter, colorFilter, onlyWithNote, sort]);

  const totalCount = highlights.length;
  const bookCount = bookList.length;
  // active dimensions count: 计算"激活的筛选维度数"而非"激活的值数"
  const activeFilterDims =
    (bookFilter.length > 0 ? 1 : 0) +
    (tagFilter.length > 0 ? 1 : 0) +
    (colorFilter.length > 0 ? 1 : 0) +
    (onlyWithNote ? 1 : 0);
  const hasFilter = !!(q || activeFilterDims);
  const clearAllFilters = () => {
    setQ(''); setBookFilter([]); setTagFilter([]); setColorFilter([]); setOnlyWithNote(false);
  };

  const toggleBook = (id: string) => setBookFilter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleTag = (name: string) => setTagFilter((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  const toggleColor = (c: HighlightColor) => setColorFilter((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const doDelete = (h: ReaderHighlight) => {
    const removed = removeHl(h.id);
    if (removed) setUndoToast({ msg: '已删除笔记', item: removed });
    setOpenMenu(null);
  };
  const doCopy = async (h: ReaderHighlight) => {
    const payload = `${h.text}${h.note ? '\n\n— ' + h.note : ''}\n\n《${h.bookTitle}》 P.${h.page}`;
    try { await navigator.clipboard.writeText(payload); } catch { /* noop */ }
    setOpenMenu(null);
  };

  // book / tag chip displayed in active-filter row
  const bookTitleById = (id: string) => bookList.find((b) => b.id === id)?.title ?? id;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的笔记</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            共 <span className="tabular-nums font-medium text-gray-700 dark:text-gray-200">{totalCount}</span> 条 · 来自 <span className="tabular-nums font-medium text-gray-700 dark:text-gray-200">{bookCount}</span> 本书
          </p>
        </div>
      </div>

      {/* Toolbar: 永远只有 搜索 + 筛选 + 排序 三个元素，不随数据增长 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索原文 / 笔记 / 标签 / 书名"
            aria-label="搜索笔记"
            className="w-full h-10 pl-9 pr-9 text-[14px] rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="清除搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 筛选 popover trigger */}
        <FilterPanelTrigger
          activeCount={activeFilterDims}
          open={filterOpen}
          onToggle={() => setFilterOpen((v) => !v)}
          onClose={() => setFilterOpen(false)}
          panel={
            <FilterPanel
              books={bookList}
              tags={tagList}
              colorCounts={colorCounts}
              bookFilter={bookFilter}
              tagFilter={tagFilter}
              colorFilter={colorFilter}
              onlyWithNote={onlyWithNote}
              onToggleBook={toggleBook}
              onToggleTag={toggleTag}
              onToggleColor={toggleColor}
              onToggleOnlyWithNote={() => setOnlyWithNote((v) => !v)}
              onClearAll={() => { setBookFilter([]); setTagFilter([]); setColorFilter([]); setOnlyWithNote(false); }}
              onDone={() => setFilterOpen(false)}
            />
          }
        />

        {/* 排序 popover */}
        <SortMenu
          value={sort}
          open={sortOpen}
          onToggle={() => setSortOpen((v) => !v)}
          onClose={() => setSortOpen(false)}
          onChange={(v) => { setSort(v); setSortOpen(false); }}
        />
      </div>

      {/* 已选筛选 chips 行：只在有任意筛选时出现 */}
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {q && (
            <ActiveChip onClear={() => setQ('')} icon={<Search size={10} />}>“{q}”</ActiveChip>
          )}
          {bookFilter.map((id) => (
            <ActiveChip key={`b-${id}`} onClear={() => toggleBook(id)} icon={<BookOpen size={10} />}>{bookTitleById(id)}</ActiveChip>
          ))}
          {tagFilter.map((t) => (
            <ActiveChip key={`t-${t}`} onClear={() => toggleTag(t)} icon={<Hash size={10} />}>{t}</ActiveChip>
          ))}
          {colorFilter.map((c) => (
            <ActiveChip key={`c-${c}`} onClear={() => toggleColor(c)} dot={HIGHLIGHT_DOT[c]}>{HIGHLIGHT_LABEL[c]}</ActiveChip>
          ))}
          {onlyWithNote && (
            <ActiveChip onClear={() => setOnlyWithNote(false)} icon={<StickyNote size={10} />}>仅含笔记</ActiveChip>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-1 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline-offset-2 hover:underline"
          >
            清空全部
          </button>
        </div>
      )}

      {/* 结果数说明（如果有筛选，显示 N / M 个匹配） */}
      {hasFilter && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 tabular-nums">
          匹配 <span className="font-medium text-gray-700 dark:text-gray-200">{filtered.length}</span> / {totalCount} 条
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          <div className="mx-auto mb-3 grid place-items-center h-14 w-14 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400">
            {hasFilter ? <Search size={22} /> : <StickyNote size={22} />}
          </div>
          <p className="text-[14px] text-gray-700 dark:text-gray-200 mb-1">
            {hasFilter ? '没有匹配的笔记' : '还没有笔记'}
          </p>
          <p className="text-[12px]">
            {hasFilter ? '尝试调整筛选条件或清空筛选' : '打开任意一本书，在正文中选中文字即可创建笔记'}
          </p>
          {hasFilter && (
            <button type="button" onClick={clearAllFilters} className="mt-3 text-[13px] text-blue-600 dark:text-blue-400 hover:underline">
              清空筛选
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {filtered.map((h) => (
            <article
              key={h.id}
              className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-sm transition p-4"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => navigate(`/reader/${h.bookId}`)}
                  className="min-w-0 text-left group/title focus:outline-none"
                  aria-label={`打开《${h.bookTitle}》`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 h-2 w-2 rounded-full ${HIGHLIGHT_DOT[h.color]}`} aria-hidden="true" />
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400">
                      {h.bookTitle}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">P.{h.page}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                    {new Date(h.updatedAt).toLocaleString()}
                  </div>
                </button>
                <div className="relative" data-note-menu>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === h.id ? null : h.id); }}
                    aria-label="更多操作"
                    aria-haspopup="menu"
                    aria-expanded={openMenu === h.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenu === h.id && (
                    <div role="menu" className="absolute right-0 top-9 z-20 w-40 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-lg slide-up">
                      <MenuItem onClick={() => { setEditing(h.id); setOpenMenu(null); }} icon={<Edit3 size={13} />} label="编辑" />
                      <MenuItem onClick={() => doCopy(h)} icon={<Copy size={13} />} label="复制" />
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">改色</div>
                      <div className="px-3 pb-1.5 flex items-center gap-1.5">
                        {HIGHLIGHT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { updateHl(h.id, { color: c }); setOpenMenu(null); }}
                            aria-label={`改为${HIGHLIGHT_LABEL[c]}`}
                            className={`h-5 w-5 rounded-full ${HIGHLIGHT_DOT[c]} ${h.color === c ? 'ring-2 ring-offset-1 ring-gray-900 dark:ring-white dark:ring-offset-zinc-800' : 'hover:scale-110'} transition`}
                          />
                        ))}
                      </div>
                      <div className="h-px bg-gray-100 dark:bg-zinc-700 my-1" />
                      <MenuItem onClick={() => doDelete(h)} icon={<Trash2 size={13} />} label="删除" danger />
                    </div>
                  )}
                </div>
              </div>

              {/* Quote */}
              <div className={`text-[13.5px] leading-relaxed ${HIGHLIGHT_BG[h.color]} text-gray-800 dark:text-gray-100 rounded-md px-3 py-2`}>
                {h.text}
              </div>

              {/* Note */}
              {h.note && (
                <p className="mt-2.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                  {h.note}
                </p>
              )}

              {/* Tags */}
              {h.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {h.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => !tagFilter.includes(t) && toggleTag(t)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:text-blue-700 dark:hover:text-blue-300 transition"
                    >
                      <Hash size={10} />{t}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Undo toast */}
      {undoToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 pl-4 pr-2 py-2 rounded-lg bg-zinc-900 text-white text-[13px] shadow-lg fade-in"
          role="status"
          aria-live="polite"
        >
          <span>{undoToast.msg}</span>
          <button
            type="button"
            onClick={() => { restoreHl(undoToast.item); setUndoToast(null); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium bg-white/10 hover:bg-white/20 transition"
          >
            <RotateCcw size={12} />撤销
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editing && (() => {
        const target = highlights.find((h) => h.id === editing);
        if (!target) return null;
        return (
          <NoteEditorModal
            mode="edit"
            initial={target}
            onClose={() => setEditing(null)}
            onSave={(data) => { updateHl(target.id, data); setEditing(null); }}
          />
        );
      })()}
    </div>
  );
}

// ─── 已激活筛选 chip ─────────────────────────────
function ActiveChip({ children, onClear, icon, dot }: { children: React.ReactNode; onClear: () => void; icon?: React.ReactNode; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[12px] bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 max-w-[200px]">
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />}
      {icon}
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="移除此筛选"
        className="inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 shrink-0"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ─── 筛选按钮 + popover 容器 ────────────────────
function FilterPanelTrigger({
  activeCount, open, onToggle, onClose, panel,
}: { activeCount: number; open: boolean; onToggle: () => void; onClose: () => void; panel: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border text-[13px] font-medium transition ${
          activeCount > 0
            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
            : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'
        }`}
      >
        <SlidersHorizontal size={15} />
        <span>筛选</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 dark:bg-blue-400 text-white dark:text-blue-950 text-[10px] font-semibold tabular-nums">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="筛选" className="absolute right-0 top-12 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl slide-up">
          {panel}
        </div>
      )}
    </div>
  );
}

// ─── 筛选面板内容 ──────────────────────────────
function FilterPanel({
  books, tags, colorCounts,
  bookFilter, tagFilter, colorFilter, onlyWithNote,
  onToggleBook, onToggleTag, onToggleColor, onToggleOnlyWithNote,
  onClearAll, onDone,
}: {
  books: { id: string; title: string; count: number }[];
  tags: { name: string; count: number }[];
  colorCounts: Record<HighlightColor, number>;
  bookFilter: string[];
  tagFilter: string[];
  colorFilter: HighlightColor[];
  onlyWithNote: boolean;
  onToggleBook: (id: string) => void;
  onToggleTag: (n: string) => void;
  onToggleColor: (c: HighlightColor) => void;
  onToggleOnlyWithNote: () => void;
  onClearAll: () => void;
  onDone: () => void;
}) {
  const [bookQ, setBookQ] = useState('');
  const [tagQ, setTagQ] = useState('');
  const hasAny = bookFilter.length || tagFilter.length || colorFilter.length || onlyWithNote;

  const visibleBooks = useMemo(
    () => bookQ ? books.filter((b) => b.title.toLowerCase().includes(bookQ.toLowerCase())) : books,
    [books, bookQ]
  );
  const visibleTags = useMemo(
    () => tagQ ? tags.filter((t) => t.name.toLowerCase().includes(tagQ.toLowerCase())) : tags,
    [tags, tagQ]
  );

  return (
    <div className="flex flex-col max-h-[min(640px,80vh)]">
      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* 书籍 */}
        <FilterSection
          title="书籍"
          icon={<BookOpen size={13} />}
          activeCount={bookFilter.length}
          totalCount={books.length}
        >
          {books.length >= 5 && (
            <FilterSearchInput value={bookQ} onChange={setBookQ} placeholder={`在 ${books.length} 本中搜索...`} />
          )}
          {visibleBooks.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">没有匹配的书</p>
          ) : (
            <ul className="max-h-[180px] overflow-y-auto -mx-1 px-1 space-y-0.5">
              {visibleBooks.map((b) => (
                <CheckboxRow
                  key={b.id}
                  checked={bookFilter.includes(b.id)}
                  onChange={() => onToggleBook(b.id)}
                  label={b.title}
                  count={b.count}
                />
              ))}
            </ul>
          )}
        </FilterSection>

        {/* 标签 */}
        {tags.length > 0 && (
          <FilterSection
            title="标签"
            icon={<Hash size={13} />}
            activeCount={tagFilter.length}
            totalCount={tags.length}
          >
            {tags.length >= 8 && (
              <FilterSearchInput value={tagQ} onChange={setTagQ} placeholder={`在 ${tags.length} 个中搜索...`} />
            )}
            {visibleTags.length === 0 ? (
              <p className="text-[12px] text-gray-400 py-2">没有匹配的标签</p>
            ) : (
              <div className="max-h-[140px] overflow-y-auto -mx-1 px-1 flex flex-wrap gap-1">
                {visibleTags.map((t) => {
                  const on = tagFilter.includes(t.name);
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => onToggleTag(t.name)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] transition ${
                        on
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <Hash size={10} />{t.name}
                      <span className={`text-[10px] tabular-nums ${on ? 'text-white/70' : 'text-gray-400'}`}>{t.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FilterSection>
        )}

        {/* 颜色 */}
        <FilterSection
          title="颜色"
          icon={<span className="inline-block h-2 w-2 rounded-full bg-gray-400" />}
          activeCount={colorFilter.length}
          totalCount={4}
        >
          <div className="flex items-center gap-2">
            {HIGHLIGHT_COLORS.map((c) => {
              const on = colorFilter.includes(c);
              const count = colorCounts[c];
              const disabled = count === 0;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleColor(c)}
                  aria-label={`${HIGHLIGHT_LABEL[c]} (${count})`}
                  aria-pressed={on}
                  className={`relative h-9 w-9 rounded-full ${HIGHLIGHT_DOT[c]} transition ${
                    on ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-zinc-900' : 'hover:scale-110'
                  } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {on && <Check size={14} className="absolute inset-0 m-auto text-white" />}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* 其它 */}
        <FilterSection title="其它" icon={<StickyNote size={13} />} activeCount={onlyWithNote ? 1 : 0} totalCount={1}>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-[13px] text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={onlyWithNote}
              onChange={onToggleOnlyWithNote}
              className="h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-400/40"
            />
            <span>仅显示包含笔记内容的高亮</span>
          </label>
        </FilterSection>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasAny}
          className="text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          清空全部
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 h-9 rounded-lg text-[13px] font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition"
        >
          完成
        </button>
      </div>
    </div>
  );
}

function FilterSection({
  title, icon, activeCount, totalCount, children,
}: { title: string; icon: React.ReactNode; activeCount: number; totalCount: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-700 dark:text-gray-200">
          {icon}<span>{title}</span>
          <span className="text-[11px] text-gray-400 font-normal">({totalCount})</span>
        </div>
        {activeCount > 0 && (
          <span className="text-[11px] text-blue-600 dark:text-blue-400 tabular-nums">{activeCount} 已选</span>
        )}
      </div>
      {children}
    </section>
  );
}

function FilterSearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-2">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-7 pr-2 text-[12px] rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
      />
    </div>
  );
}

function CheckboxRow({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count: number }) {
  return (
    <li>
      <label className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-400/40"
        />
        <span className={`flex-1 min-w-0 truncate text-[13px] ${checked ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-400">{count}</span>
      </label>
    </li>
  );
}

// ─── 排序自定义下拉（取代原生 <select>）─────────
function SortMenu({
  value, open, onToggle, onClose, onChange,
}: { value: NotesSort; open: boolean; onToggle: () => void; onClose: () => void; onChange: (v: NotesSort) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 text-[13px] font-medium transition"
      >
        <ArrowUpDown size={14} />
        <span>{SORT_LABEL[value]}</span>
        <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="排序方式" className="absolute right-0 top-12 z-30 min-w-[140px] py-1 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl slide-up">
          {(Object.keys(SORT_LABEL) as NotesSort[]).map((k) => (
            <li key={k}>
              <button
                type="button"
                role="option"
                aria-selected={value === k}
                onClick={() => onChange(k)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition ${
                  value === k
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{SORT_LABEL[k]}</span>
                {value === k && <Check size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MenuItem({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] transition ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
      }`}
    >
      {icon}<span>{label}</span>
    </button>
  );
}



// ── AI Provider Editor Modal ──────────────────────────────
function AIProviderEditorModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Omit<AIProvider, 'id'> | AIProvider;
  onSave: (data: Omit<AIProvider, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [temperature, setTemperature] = useState(initial.temperature);
  const [maxTokens, setMaxTokens] = useState(initial.maxTokens);
  const [showKey, setShowKey] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim() || !model.trim()) return;
    onSave({ name: name.trim(), baseUrl: baseUrl.trim(), apiKey, model: model.trim(), temperature, maxTokens });
  };

  const normalizeBaseUrl = (url: string) => {
    let u = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    return u;
  };

  const fetchModels = async () => {
    const url = normalizeBaseUrl(baseUrl);
    if (!url) return;
    setFetchingModels(true);
    setFetchedModels([]);
    try {
      const res = await fetch(`${url}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const ids = (data.data || []).map((m: { id: string }) => m.id).sort();
      setFetchedModels(ids);
      setTestResult({ ok: true, msg: `找到 ${ids.length} 个模型` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || '获取失败' });
    } finally {
      setFetchingModels(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const testModel = async () => {
    const url = normalizeBaseUrl(baseUrl);
    if (!url || !model.trim()) return;
    setTestingModel(true);
    setTestResult(null);
    try {
      const res = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: model.trim(),
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 16,
          temperature: 0,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      setTestResult({ ok: true, msg: reply ? `连接成功` : '无响应' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || '测试失败' });
    } finally {
      setTestingModel(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const btnCls =
    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const commonModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'claude-sonnet-4-20250514', 'deepseek-chat', 'qwen2.5:7b', 'llama3.1:8b'];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{'id' in initial ? '编辑模型' : '添加模型'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">名称</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="如：OpenAI" />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Base URL</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API Key</label>
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">模型名</label>
              <button
                type="button"
                onClick={fetchModels}
                disabled={fetchingModels || !baseUrl.trim()}
                className={`${btnCls} flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700`}
              >
                {fetchingModels ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                获取模型列表
              </button>
            </div>
            <div className="relative">
              <Cpu size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
            {fetchedModels.length > 0 ? (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 p-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {fetchedModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => setModel(m)}
                      className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                        model === m
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {commonModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                      model === m
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Temperature <span className="text-blue-500 font-mono">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>精确 (0)</span>
              <span>平衡 (1)</span>
              <span>创意 (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Tokens</label>
            <input
              type="number"
              min={256}
              max={128000}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>

        {/* Test result banner */}
        {testResult && (
          <div
            className={`mx-5 mb-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 fade-in ${
              testResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40'
            }`}
          >
            {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span className="truncate">{testResult.msg}</span>
          </div>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={testModel}
            disabled={testingModel || !baseUrl.trim() || !model.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {testingModel ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            测试连接
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || !model.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings Page
function SettingsPage() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { aiProviders, activeAIProviderId, addProvider, updateProvider, removeProvider, setActiveProvider } = useSettingsStore();
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddSave = (data: Omit<AIProvider, 'id'>) => {
    addProvider(data);
    setAddingProvider(false);
  };

  const handleEditSave = (data: Omit<AIProvider, 'id'>) => {
    if (!editingProvider) return;
    updateProvider(editingProvider.id, data);
    setEditingProvider(null);
  };

  const sectionCls = 'bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800';
  const sectionTitleCls = 'text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Settings size={24} className="text-blue-500" />
        设置
      </h1>

      <div className="space-y-6">
        {/* ── 外观 ── */}
        <div>
          <h2 className={sectionTitleCls}>外观</h2>
          <div className={`${sectionCls} p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={20} className="text-gray-600 dark:text-gray-400" /> : <Sun size={20} className="text-gray-600 dark:text-gray-400" />}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">深色模式</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">切换应用主题</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-7 rounded-full transition-colors ${isDarkMode ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── AI 模型 ── */}
        <div>
          <h2 className={sectionTitleCls}>AI 模型</h2>
          <div className="space-y-2">
            {aiProviders.map((p) => {
              const isActive = p.id === activeAIProviderId;
              return (
                <div
                  key={p.id}
                  className={`${sectionCls} p-4 transition-colors ${isActive ? 'ring-2 ring-blue-500/40' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Active radio */}
                    <button
                      onClick={() => setActiveProvider(isActive ? null : p.id)}
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-zinc-600'
                      }`}
                      aria-label={isActive ? '取消激活' : '设为激活'}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {p.model} · {p.baseUrl}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingProvider(p)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => removeProvider(p.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add button */}
            <button
              onClick={() => setAddingProvider(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-blue-500 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus size={18} />
              添加模型
            </button>
          </div>
        </div>

        {/* ── 账号 ── */}
        <div>
          <h2 className={sectionTitleCls}>账号</h2>
          <div className="space-y-2">
            <div className={`${sectionCls} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download size={20} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">导出数据</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">导出所有笔记和阅读记录</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                  导出
                </button>
              </div>
            </div>

            <div className={`${sectionCls} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LogOut size={20} className="text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">退出登录</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">退出当前账户</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400">
        <p>个人书库 v1.0.0</p>
      </div>

      {/* Modals */}
      {addingProvider && (
        <AIProviderEditorModal
          initial={{ name: '', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048 }}
          onSave={handleAddSave}
          onClose={() => setAddingProvider(false)}
        />
      )}
      {editingProvider && (
        <AIProviderEditorModal
          initial={editingProvider}
          onSave={handleEditSave}
          onClose={() => setEditingProvider(null)}
        />
      )}
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useContext(AuthContext);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Layout Component
function LayoutComponent() {
  const { logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize data from backend
  const initStore = useStore((s) => s.init);
  useEffect(() => {
    initStore();
  }, [initStore]);

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/library', icon: Library, label: '书库' },
    { path: '/recent', icon: Clock, label: '在读' },
    { path: '/notes', icon: BookOpen, label: '笔记' },
    { path: '/settings', icon: Settings, label: '设置' },
  ];

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex">
      <aside
        className={`fixed lg:sticky lg:self-start lg:top-0 inset-y-0 lg:inset-y-auto left-0 z-50 h-screen lg:h-screen shrink-0 transition-[width] duration-300 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 overflow-hidden`}
        style={{ width: sidebarOpen ? '16rem' : '5rem' }}
      >
        <div className="h-full flex flex-col p-4">
          <div className={`flex items-center gap-3 mb-8 ${sidebarOpen ? 'px-2' : 'justify-center px-2'}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
              <BookOpen size={20} />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                个人书库
              </span>
            )}
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="space-y-1 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              onClick={() => navigate('/upload')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <UploadIcon size={20} />
              {sidebarOpen && <span className="font-medium">上传书籍</span>}
            </button>
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {sidebarOpen && (
                <span className="font-medium">
                  {isDarkMode ? '亮色模式' : '暗色模式'}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="font-medium">退出登录</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Main App
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize all backend-connected stores once on mount
  const initBooks = useBooksStore((s) => s.init);
  const initNotes = useNotesStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);
  const refreshBooks = useBooksStore((s) => s.refresh);
  const refreshNotes = useNotesStore((s) => s.refresh);
  const refreshSettings = useSettingsStore((s) => s.refresh);
  const refreshStore = useStore((s) => s.refresh);
  useEffect(() => {
    initBooks();
    initNotes();
    initSettings();
  }, [initBooks, initNotes, initSettings]);

  // Refresh data when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshBooks();
        refreshNotes();
        refreshSettings();
        refreshStore();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshBooks, refreshNotes, refreshSettings, refreshStore]);

  const login = (password: string) => {
    if (password === '123456') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
        <div className={isDarkMode ? 'dark' : ''}>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <LayoutComponent />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/reader/:id" element={<ReaderPage />} />
                <Route path="/recent" element={<RecentPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/ai" element={<Navigate to="/" replace />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Router>
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
