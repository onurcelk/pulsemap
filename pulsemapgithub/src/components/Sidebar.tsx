import { useState, useMemo, useEffect, useRef } from 'react';
import { MapEvent, EventCategory } from '../types';
import { TimeRange } from '../App';
import EventCard from './EventCard';
import { Search, X, Clock, Bell, Languages, Check, AlertCircle, Sun, Moon, Radio, Archive, RefreshCw, Globe, Crosshair, Flame, Users, Landmark, Heart, Rocket, Zap, Gem, Anchor, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  events: MapEvent[];
  selectedEventId?: string | null;
  onEventClick?: (event: MapEvent) => void;
  onCloseEvent?: () => void;
  onClose?: () => void;
  selectedCategories?: Set<string>;
  onCategorySelect?: (category: EventCategory) => void;
  timeRange?: TimeRange;
  onTimeRangeSelect?: (range: TimeRange) => void;
  isLoading?: boolean;
  // Mode controls
  isDarkMode?: boolean;
  onDarkModeToggle?: () => void;
  isLiveMode?: boolean;
  onLiveModeToggle?: () => void;
  isArchiveMode?: boolean;
  onArchiveToggle?: () => void;
  lastSync?: Date | null;
  onManualRefresh?: () => void;
  showStrategicAssets?: boolean;
  onStrategicAssetsToggle?: () => void;
  selectedStrategicTypes?: Set<string>;
  onStrategicTypeSelect?: (type: string) => void;
  onHelpRequested?: () => void;
}

const CATEGORIES = [
  { id: 'military' as EventCategory, label: 'Military', dotClass: 'bg-red-500', icon: Crosshair, activeClass: 'border-red-500/70 bg-red-500/15 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'explosion' as EventCategory, label: 'Explosion', dotClass: 'bg-orange-500', icon: Flame, activeClass: 'border-orange-500/70 bg-orange-500/15 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'protest' as EventCategory, label: 'Protest', dotClass: 'bg-blue-500', icon: Users, activeClass: 'border-blue-500/70 bg-blue-500/15 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'politics' as EventCategory, label: 'Politics', dotClass: 'bg-purple-500', icon: Landmark, activeClass: 'border-purple-500/70 bg-purple-500/15 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'humanitarian' as EventCategory, label: 'Humanitarian', dotClass: 'bg-emerald-500', icon: Heart, activeClass: 'border-emerald-500/70 bg-emerald-500/15 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
];

const STRATEGIC_TYPES = [
  { id: 'nuclear', label: 'Nuclear', dotClass: 'bg-[#facc15]', icon: Radio, activeClass: 'border-yellow-400/60 bg-yellow-400/10 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'military', label: 'Base', dotClass: 'bg-[#6366f1]', icon: Crosshair, activeClass: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'space', label: 'Space', dotClass: 'bg-[#ec4899]', icon: Rocket, activeClass: 'border-pink-400/60 bg-pink-400/10 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'oil', label: 'Energy', dotClass: 'bg-[#475569]', icon: Zap, activeClass: 'border-slate-400/60 bg-slate-400/10 text-slate-300 drop-shadow-[0_0_8px_rgba(148,163,184,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'mining', label: 'Resources', dotClass: 'bg-[#fb923c]', icon: Gem, activeClass: 'border-orange-400/60 bg-orange-400/10 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
  { id: 'chokepoint', label: 'Chokepoint', dotClass: 'bg-[#2dd4bf]', icon: Anchor, activeClass: 'border-teal-400/60 bg-teal-400/10 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]', inactiveClass: 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50' },
];

const TIME_FILTERS: { id: TimeRange; label: string }[] = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '1w', label: '1W' },
  { id: 'all', label: 'All' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh-CN', label: '简体中文' },
];

export default function Sidebar({
  events,
  selectedEventId,
  onEventClick,
  onCloseEvent,
  onClose,
  selectedCategories = new Set(),
  onCategorySelect,
  timeRange = 'all',
  onTimeRangeSelect,
  isLoading = false,
  isDarkMode = true,
  onDarkModeToggle,
  isLiveMode = false,
  onLiveModeToggle,
  isArchiveMode = false,
  onArchiveToggle,
  lastSync,
  onManualRefresh,
  showStrategicAssets = false,
  onStrategicAssetsToggle,
  selectedStrategicTypes = new Set(),
  onStrategicTypeSelect,
  onHelpRequested,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  // 300ms debounce on search input (PERF-02)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtered = useMemo(() => {
    let result = [...events];
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    // Sort so hot stories are at the top (grouped by hotScore descending)
    return result.sort((a, b) => {
      const aScore = (a as any).hotScore || 1;
      const bScore = (b as any).hotScore || 1;
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [events, debouncedQuery]);

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    setIsLangMenuOpen(false);
    // @ts-ignore
    if (window.triggerTranslate) {
      // @ts-ignore
      window.triggerTranslate(code);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] border-r border-[var(--line)] w-80 md:w-[400px] shadow-2xl relative overflow-hidden transition-colors">

      {/* ── Security Scan Line (Visual) ── */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-20 animate-pulse pointer-events-none" />

      {/* ── Header ── */}
      <div className="p-5 border-b border-[var(--line)] bg-[var(--bg)]/50 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-red-500/20">
              <Bell size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none uppercase">PulseMap</h1>
              <p className="text-[9px] font-mono tracking-[0.2em] opacity-40 uppercase mt-1">Tactical Analysis System</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={onHelpRequested}
              className="p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors opacity-90"
              title="PulseMap Tutorial & Help"
            >
              <HelpCircle size={15} />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors flex items-center gap-1 ${isLangMenuOpen ? 'bg-[var(--line)] text-[var(--ink)]' : 'opacity-90'}`}
                title="Translation"
              >
                <Languages size={15} />
                <span className="text-[10px] font-mono font-bold uppercase">{currentLang}</span>
              </button>
              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-2xl z-[100] border border-[var(--line)] overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => handleLangChange(lang.code)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${currentLang === lang.code ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)] opacity-60 hover:opacity-100'}`}
                        >
                          {lang.label}
                          {currentLang === lang.code && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden p-2 hover:bg-[var(--line)] rounded-lg transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={14} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter incoming telemetry..."
              className="w-full pl-9 pr-8 py-2.5 bg-[var(--line)]/30 border border-[var(--line)] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--ink-dim)]/50"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Combined Pill Filters */}
        <div id="sidebar-filters" className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {TIME_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => onTimeRangeSelect?.(f.id)}
                  className={[
                    'px-3 py-1 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-tighter',
                    timeRange === f.id
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-red-500/20'
                      : 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategorySelect?.(cat.id)}
                  className={[
                    'px-2.5 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-widest border transition-all flex items-center gap-1.5',
                    isActive ? cat.activeClass : cat.inactiveClass,
                  ].join(' ')}
                >
                  <cat.icon size={12} strokeWidth={2.5} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {showStrategicAssets && (
            <div id="sidebar-strategic" className="flex flex-wrap gap-2 pt-1 mt-2 border-t border-[var(--line)]/50 pt-3">
              <div className="w-full mb-1">
                <span className="text-[8px] font-mono font-black uppercase tracking-[0.2em] opacity-30">Strategic Assets</span>
              </div>
              {STRATEGIC_TYPES.map(type => {
                const isActive = selectedStrategicTypes.has(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => onStrategicTypeSelect?.(type.id)}
                    className={`px-2 py-1 rounded-md text-[8px] uppercase font-bold tracking-widest border transition-all flex items-center gap-1.5 ${isActive
                      ? type.activeClass + ' opacity-100'
                      : 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--line)]/10 hover:bg-[var(--line)]/30'
                      }`}
                  >
                    <type.icon size={10} strokeWidth={2.5} />
                    {type.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Feed Listing ── */}
      <div id="sidebar-intel-feed" className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3 md:space-y-4 scrollbar-thin scroll-smooth relative bg-[var(--bg)]/40 md:bg-transparent">
        <div className="flex items-center justify-between px-1 mb-2 border-b border-[var(--line)] sticky top-0 bg-[var(--bg)]/80 backdrop-blur-md z-[5]">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] opacity-40">Live Intel Feed</span>
          <div className="flex gap-1">
            <span className="text-[9px] font-mono opacity-20">{filtered.length} NODES ACTIVE</span>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {isLoading && events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-10 text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full border border-[var(--line)] flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border border-[var(--accent)] animate-ping opacity-20" />
                <Clock className="opacity-20 translate-y-[-2px]" size={24} />
              </div>
              <p className="text-xs font-mono opacity-30 uppercase tracking-widest">Synchronizing Satellite Link...</p>
            </motion.div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-10 text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full border border-[var(--line)] flex items-center justify-center relative">
                <AlertCircle className="opacity-20" size={24} />
              </div>
              <p className="text-xs font-mono opacity-40 uppercase tracking-widest">No Intel For This Region</p>
              <p className="text-[10px] font-mono opacity-20 uppercase tracking-wider">Try a different region or time range</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center opacity-30 h-full flex items-center justify-center">
              <p className="text-sm font-mono tracking-widest uppercase">No Signal Matches Search</p>
            </motion.div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {filtered.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  layout
                >
                  <EventCard
                    event={event}
                    isSelected={selectedEventId === event.id}
                    onClick={onEventClick}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mode Controls Strip ── */}
      <div className="border-t border-[var(--line)] px-4 py-3 flex items-center gap-2 bg-[var(--bg)]/60 backdrop-blur-md">
        {/* Dark / Light */}
        <button
          onClick={onDarkModeToggle}
          className="p-2 rounded-xl hover:bg-[var(--line)] transition-all group flex-shrink-0"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode
            ? <Sun size={16} className="text-yellow-400 group-hover:rotate-90 transition-transform duration-300" />
            : <Moon size={16} className="text-slate-500" />}
        </button>

        {/* Strategic Assets Toggle */}
        <button
          onClick={onStrategicAssetsToggle}
          className={[
            'p-2 rounded-xl transition-all flex-shrink-0',
            showStrategicAssets ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' : 'hover:bg-[var(--line)] opacity-40 hover:opacity-100'
          ].join(' ')}
          title="Toggle Strategic Intelligence Layer"
        >
          <Globe size={16} className={showStrategicAssets ? 'animate-spin-slow' : ''} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--line)] flex-shrink-0" />

        {/* Archive */}
        <button
          onClick={onArchiveToggle}
          className={[
            'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all flex-shrink-0',
            isArchiveMode ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : 'hover:bg-[var(--line)] opacity-50 hover:opacity-100'
          ].join(' ')}
          title="Historical Archive"
        >
          <Archive size={13} />
          <span className="hidden md:inline">Archive</span>
        </button>

        {/* Engage Sync */}
        <button
          onClick={onLiveModeToggle}
          disabled={isArchiveMode}
          className={[
            'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all flex-1 justify-center',
            isLiveMode ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' : 'hover:bg-[var(--line)] opacity-50 hover:opacity-100',
            isArchiveMode ? 'cursor-not-allowed opacity-20 pointer-events-none' : ''
          ].join(' ')}
          title="Toggle Live Mode"
        >
          <div className="relative flex-shrink-0">
            {isLiveMode && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40" />}
            <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-[var(--accent)]' : 'bg-gray-400'}`} />
          </div>
          <span>{isLiveMode ? 'Active Intel' : 'Engage Sync'}</span>
        </button>

        {/* Manual Refresh */}
        <button
          onClick={onManualRefresh}
          disabled={isLoading || isArchiveMode}
          className="p-2 rounded-xl hover:bg-[var(--line)] opacity-50 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-20 disabled:pointer-events-none"
          title={lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Refresh'}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin text-[var(--accent)]' : ''} />
        </button>
      </div>

      {/* ── Visual Footer ── */}
      <div className="px-4 py-2.5 border-t border-[var(--line)] flex items-center justify-between bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_8px_var(--success)]" />
          <span className="text-[9px] font-mono font-bold opacity-30 uppercase tracking-tighter">All Systems Nominal</span>
        </div>
        <div className="text-[9px] font-mono opacity-10">v2.4.0-TACTICAL</div>
      </div>
    </div>
  );
}
