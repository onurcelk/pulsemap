import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import { MapEvent, Region, EventCategory, StrategicAsset, LiveAircraft, LiveShip } from './types';
import {
  Globe, Map as MapIcon, RefreshCw, Loader2, Moon, Sun, Menu, X,
  Radio, Activity, ChevronUp, ChevronDown, Clock, Languages, Archive, Search, CalendarRange
} from 'lucide-react';
import { RawNewsItem } from './services/newsService';
import { motion, AnimatePresence } from 'motion/react';
import TutorialOverlay from './components/TutorialOverlay';
import RegionSelectionModal from './components/RegionSelectionModal';

export type TimeRange = '1h' | '24h' | '1w' | 'all';

const REGIONS: Region[] = [
  { id: 'middle-east', name: 'Middle East', center: [33, 44], zoom: 5 },
  { id: 'europe', name: 'Europe / UKR', center: [49, 31], zoom: 5 },
  { id: 'asia', name: 'Asia / HK / TW', center: [30, 105], zoom: 4 },
  { id: 'north-america', name: 'North America', center: [38, -98], zoom: 4 },
  { id: 'south-america', name: 'South America', center: [-15, -60], zoom: 4 },
  { id: 'africa', name: 'Africa', center: [5, 25], zoom: 4 },
];

const REGION_ID_TO_LABEL: Record<string, string> = {
  'middle-east': 'Middle East',
  'europe': 'Europe / UKR',
  'asia': 'Asia / HK / TW',
  'north-america': 'North America',
  'south-america': 'South America',
  'africa': 'Africa',
};

export default function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(REGIONS[0]);
  const [activeRegionId, setActiveRegionId] = useState<string>(REGIONS[0].id);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [strategicAssets, setStrategicAssets] = useState<StrategicAsset[]>([]);
  const [showStrategicAssets, setShowStrategicAssets] = useState(true);
  const [selectedStrategicTypes, setSelectedStrategicTypes] = useState<Set<string>>(new Set(['nuclear', 'military', 'chokepoint', 'space', 'oil', 'mining']));
  const [liveAircraft, setLiveAircraft] = useState<LiveAircraft[]>([]);
  const [liveShips, setLiveShips] = useState<LiveShip[]>([]);
  const isFetchingRef = useRef(false);
  const isFetchingAircraftRef = useRef(false);

  // ── Archive Mode ──
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [archiveFrom, setArchiveFrom] = useState(sevenDaysAgo);
  const [archiveTo, setArchiveTo] = useState(today);
  const [archiveKeyword, setArchiveKeyword] = useState('');
  const [archiveEvents, setArchiveEvents] = useState<MapEvent[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const LOADING_MESSAGES = [
    "Establishing tactical link...",
    "Scanning multi-source telemetry...",
    "Aligning satellite grid...",
    "Filtering low-confidence signals...",
  ];

  // ── Modals & Overlay State ──
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);

  useEffect(() => {
    // Determine startup sequence: Region Selector -> Tutorial -> Main App
    const savedRegionId = localStorage.getItem('pulsemap_default_region');
    const hasSeenTutorial = localStorage.getItem('pulsemap_tutorial_seen');

    if (!savedRegionId) {
      // First time visitor needs to pick a region
      setShowRegionSelector(true);
    } else {
      // Setup returning user's saved region
      const loadedRegion = REGIONS.find(r => r.id === savedRegionId);
      if (loadedRegion) {
        setCurrentRegion(loadedRegion);
        setActiveRegionId(loadedRegion.id);
      }
      // If returning but hasn't finished tutorial, show it
      if (!hasSeenTutorial) setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const fetchAndProcessNews = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/news');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawNews: RawNewsItem[] = await response.json();
      setEvents(rawNews as any);
      setLastSync(new Date());
    } catch (err: any) {
      console.error("Failed to fetch news:", err);
      setError("Sync failed");
      setRetryCountdown(30);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAndProcessNews();

    // Fetch strategic assets once
    fetch('/api/strategic-assets')
      .then(res => res.json())
      .then(data => setStrategicAssets(data))
      .catch(err => console.error("Failed to fetch strategic assets:", err));
  }, [fetchAndProcessNews]);

  // ── Archive Fetch ──
  const fetchArchive = useCallback(async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const params = new URLSearchParams({ from: archiveFrom, to: archiveTo });
      if (archiveKeyword.trim()) params.set('q', archiveKeyword.trim());
      const res = await fetch(`/api/historical?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setArchiveEvents(data as MapEvent[]);
    } catch (err: any) {
      setArchiveError(err.message);
      setArchiveEvents([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveFrom, archiveTo, archiveKeyword]);

  // Auto-retry countdown on error (UX-03)
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown === 0) {
      setRetryCountdown(null);
      setError(null);
      fetchAndProcessNews();
      return;
    }
    const t = setTimeout(() => setRetryCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [retryCountdown, fetchAndProcessNews]);

  const handleRegionChange = (region: Region) => {
    setActiveRegionId(region.id);
    setCurrentRegion(region);
    setSelectedEventId(null);
  };

  const handleEventClick = (event: MapEvent) => {
    setSelectedEventId(event.id);
    const targetZoom = Math.max(currentRegion.zoom, 8);
    setCurrentRegion({
      id: "focus",
      name: event.location.name,
      center: [event.location.lat, event.location.lng],
      zoom: targetZoom
    });
  };

  const closeEvent = () => setSelectedEventId(null);

  useEffect(() => {
    if (!isLiveMode) {
      setLiveAircraft([]); // Clear aircraft when turning off radar
      setLiveShips([]); // Clear ships
      return;
    }

    // Initial fetch
    fetchAndProcessNews();

    const fetchAircraft = async () => {
      if (isFetchingAircraftRef.current) return;
      isFetchingAircraftRef.current = true;
      try {
        const res = await fetch('/api/aircraft');
        if (res.ok) {
          const data = await res.json();
          setLiveAircraft(prev => {
            const incoming: LiveAircraft[] = data.aircraft || [];
            return incoming.map(newAc => {
              const existing = prev.find(p => p.id === newAc.id);
              let history = existing?.history || [];
              if (existing) {
                const moved = Math.abs(existing.lat - newAc.lat) > 0.0001 || Math.abs(existing.lng - newAc.lng) > 0.0001;
                if (moved) {
                  history = [...history, [existing.lat, existing.lng]];
                  if (history.length > 30) history = history.slice(history.length - 30);
                }
              }
              return { ...newAc, history };
            });
          });
          setLiveShips(data.ships || []);
        }
      } catch (err) {
        // silently fail if radar tracking endpoints are down
      } finally {
        isFetchingAircraftRef.current = false;
      }
    };

    fetchAircraft(); // Fetch immediately on radar activation

    // Poll aircraft every 15s, News every 3 mins
    const aircraftInterval = setInterval(fetchAircraft, 15000);
    const newsInterval = setInterval(fetchAndProcessNews, 180000);

    return () => {
      clearInterval(aircraftInterval);
      clearInterval(newsInterval);
    };
  }, [isLiveMode, fetchAndProcessNews]);

  const filteredEvents = useMemo(() => {
    // In archive mode, use archiveEvents; skip time filter (dates already constrained)
    const sourceEvents = isArchiveMode ? archiveEvents : events;
    const canonicalLabel = REGION_ID_TO_LABEL[activeRegionId] || activeRegionId;
    return sourceEvents.filter(e => {
      if (activeRegionId !== 'world') {
        const textToSearch = (e.title + ' ' + e.description).toLowerCase();
        const isSameRegion = e.region?.toLowerCase() === canonicalLabel.toLowerCase();
        const regionKeywords: Record<string, string[]> = {
          'middle-east': ['iraq', 'iran', 'israel', 'syria', 'palestine', 'gaza', 'hamas', 'hezbollah', 'houthi', 'yemen', 'lebanon', 'qatar', 'tehran', 'baghdad', 'beirut', 'damascus', 'middle east'],
          'europe': ['ukraine', 'russia', 'kyiv', 'moscow', 'donbas', 'crimea', 'putin', 'zelensky', 'serbia', 'kosovo', 'nato', 'european union', 'poland', 'belarus'],
          'asia': ['taiwan', 'myanmar', 'north korea', 'south china sea', 'kashmir', 'seoul', 'tokyo', 'afghanistan', 'taliban', 'armenia', 'azerbaijan', 'india', 'pakistan', 'china', 'beijing', 'japan'],
          'north-america': ['usa', 'united states', 'canada', 'mexico', 'washington', 'pentagon', 'congress', 'border', 'fbi', 'cia', 'north america'],
          'south-america': ['venezuela', 'brazil', 'colombia', 'argentina', 'chile', 'peru', 'ecuador', 'bolivia', 'guyana', 'paraguay', 'uruguay', 'suriname', 'south america'],
          'africa': ['sudan', 'ethiopia', 'somalia', 'nigeria', 'mali', 'niger', 'burkina faso', 'congo', 'drc', 'goma', 'kenya', 'uganda', 'libya', 'sahel', 'rsf'],
        };
        const keywords = regionKeywords[activeRegionId] || [];
        const hasKeywordMatch = keywords.some(k => textToSearch.includes(k));
        const itemRegionLabel = e.region?.toLowerCase();
        const isOtherDefinedRegion = itemRegionLabel && itemRegionLabel !== 'global' && itemRegionLabel !== canonicalLabel.toLowerCase();
        if (isOtherDefinedRegion) return false;
        if (!isSameRegion && !hasKeywordMatch) return false;
      }
      if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false;
      // Skip time filter in archive mode
      if (!isArchiveMode && timeRange !== 'all') {
        const eventTime = new Date(e.timestamp).getTime();
        const hoursDiff = (Date.now() - eventTime) / (1000 * 60 * 60);
        if (timeRange === '1h' && hoursDiff > 1) return false;
        if (timeRange === '24h' && hoursDiff > 24) return false;
        if (timeRange === '1w' && hoursDiff > 168) return false;
      }
      return true;
    });
  }, [events, archiveEvents, isArchiveMode, activeRegionId, selectedCategories, timeRange]);

  const filteredStrategicAssets = useMemo(() => {
    return strategicAssets.filter(asset => selectedStrategicTypes.has(asset.type));
  }, [strategicAssets, selectedStrategicTypes]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  return (
    <div className="flex h-screen w-full bg-[var(--bg)] text-[var(--ink)] overflow-hidden font-sans transition-colors duration-300">

      {/* ── REGION SELECTION FOR NEW VISITORS ── */}
      <RegionSelectionModal
        isOpen={showRegionSelector}
        regions={REGIONS}
        onSelectRegion={(r) => {
          localStorage.setItem('pulsemap_default_region', r.id);
          setCurrentRegion(r);
          setActiveRegionId(r.id);
          setShowRegionSelector(false);
          // If they haven't seen the tutorial, trigger it immediately after region selection
          if (!localStorage.getItem('pulsemap_tutorial_seen')) {
            setShowTutorial(true);
          }
        }}
      />

      {/* ── Initial Loading Overlay ── */}
      <AnimatePresence>
        {isLoading && events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
          >
            <div className="relative mb-12">
              <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
              <Activity size={80} className="text-[var(--accent)] animate-pulse" />
            </div>
            <h2 className="text-2xl font-black font-mono uppercase tracking-[0.4em] mb-4 text-[var(--ink)]">System Loading</h2>
            <div className="flex items-center gap-3">
              <div className="w-48 h-1 bg-[var(--line)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="h-full bg-[var(--accent)]"
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--ink-dim)] w-48 truncate">{LOADING_MESSAGES[loadingMsgIdx]}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner with Auto-Retry Countdown (UX-03) ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-4 px-6 py-3 bg-red-600/90 backdrop-blur-md text-white text-xs font-mono font-bold"
          >
            <span className="uppercase tracking-widest">{error}</span>
            {retryCountdown !== null && (
              <span className="opacity-70">— retrying in {retryCountdown}s</span>
            )}
            <button
              onClick={() => { setRetryCountdown(null); setError(null); fetchAndProcessNews(); }}
              className="ml-2 px-3 py-1 border border-white/40 rounded-lg hover:bg-white/20 transition-all uppercase tracking-wider text-[10px]"
            >
              Retry Now
            </button>
            <button onClick={() => { setError(null); setRetryCountdown(null); }} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1490] bg-black/40 backdrop-blur-md md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div id="app-sidebar" className={[ // Added id="app-sidebar"
        "fixed md:relative z-[1500] h-full transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none",
      ].join(' ')}>
        <Sidebar
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onEventClick={(e) => { handleEventClick(e); setIsSidebarOpen(false); }}
          onCloseEvent={closeEvent}
          selectedCategories={selectedCategories}
          onCategorySelect={(cat: EventCategory) => {
            setSelectedCategories(prev => {
              const next = new Set(prev);
              if (next.has(cat)) next.delete(cat);
              else next.add(cat);
              return next;
            });
          }}
          timeRange={timeRange}
          onTimeRangeSelect={setTimeRange}
          onClose={() => setIsSidebarOpen(false)}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onDarkModeToggle={() => setIsDarkMode(v => !v)}
          isLiveMode={isLiveMode}
          onLiveModeToggle={() => { if (!isArchiveMode) setIsLiveMode(v => !v); }}
          isArchiveMode={isArchiveMode}
          onArchiveToggle={() => {
            if (isLiveMode) setIsLiveMode(false);
            setIsArchiveMode(v => !v);
            setArchiveEvents([]);
            setArchiveError(null);
          }}
          lastSync={lastSync}
          onManualRefresh={fetchAndProcessNews}
          showStrategicAssets={showStrategicAssets}
          onStrategicAssetsToggle={() => setShowStrategicAssets(v => !v)}
          selectedStrategicTypes={selectedStrategicTypes}
          onStrategicTypeSelect={(type) => {
            setSelectedStrategicTypes(prev => {
              const next = new Set(prev);
              if (next.has(type)) next.delete(type);
              else next.add(type);
              return next;
            });
          }}
          onHelpRequested={() => setShowTutorial(true)}
        />
      </div>

      <main id="app-map-area" className="flex-1 relative flex flex-col min-w-0"> {/* Added id="app-map-area" */}

        {/* ── TACTICAL TOP BAR ── */}
        <div id="app-top-bar" className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none md:flex-row md:items-start md:justify-between"> {/* Added id="app-top-bar" */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-3 glass rounded-2xl flex-shrink-0 group hover:bg-[var(--line)] transition-all"
            >
              <Menu size={20} className="group-hover:text-[var(--accent)] transition-colors" />
            </button>

            <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-2xl p-1.5 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth items-center">
              {REGIONS.map((region) => (
                <button
                  key={region.id}
                  onClick={() => handleRegionChange(region)}
                  className={[
                    "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeRegionId === region.id
                      ? "bg-[var(--ink)] text-[var(--bg)] shadow-lg shadow-black/20"
                      : "text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
                  ].join(' ')}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── ARCHIVE DATE PICKER BAR ── */}
        <AnimatePresence>
          {isArchiveMode && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-[4.5rem] left-4 right-4 z-[999] pointer-events-auto"
            >
              <div className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 border border-amber-400/30 shadow-2xl shadow-amber-900/20">
                <Archive size={14} className="text-amber-400 flex-shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Archive Mode</span>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="opacity-40 uppercase text-[9px] tracking-wider">From</span>
                    <input
                      type="date"
                      value={archiveFrom}
                      max={archiveTo}
                      onChange={e => setArchiveFrom(e.target.value)}
                      className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-amber-400/60 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px) font-mono">
                    <span className="opacity-40 uppercase text-[9px] tracking-wider">To</span>
                    <input
                      type="date"
                      value={archiveTo}
                      min={archiveFrom}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setArchiveTo(e.target.value)}
                      className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-amber-400/60 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Keyword (optional)..."
                    value={archiveKeyword}
                    onChange={e => setArchiveKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchArchive()}
                    className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono flex-1 min-w-[120px] placeholder:opacity-30 focus:outline-none focus:border-amber-400/60"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchArchive}
                    disabled={archiveLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    {archiveLoading
                      ? <><Loader2 size={11} className="animate-spin" /> Scanning...</>
                      : <><Search size={11} /> Query</>}
                  </button>
                  <button
                    onClick={() => { setIsArchiveMode(false); setArchiveEvents([]); setArchiveError(null); }}
                    className="p-1.5 hover:bg-[var(--line)] rounded-lg transition-colors opacity-50 hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                {archiveError && (
                  <div className="w-full text-[10px] font-mono text-red-400 mt-1 flex items-center gap-2">
                    <X size={10} /> {archiveError}
                  </div>
                )}
                {!archiveLoading && !archiveError && archiveEvents.length > 0 && (
                  <div className="w-full text-[10px] font-mono text-amber-400/60 mt-1">
                    {archiveEvents.length} events found · {archiveFrom} → {archiveTo}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TutorialOverlay
          isOpen={showTutorial}
          onComplete={() => setShowTutorial(false)}
        />

        {/* ── MAP AREA ── */}
        <div className="flex-1 relative z-0">
          <Map
            events={filteredEvents}
            center={[currentRegion.center[0], currentRegion.center[1]]}
            zoom={currentRegion.zoom}
            onEventClick={handleEventClick}
            selectedEventId={selectedEventId}
            isDarkMode={isDarkMode}
            isLiveMode={isLiveMode}
            strategicAssets={filteredStrategicAssets}
            showStrategicAssets={showStrategicAssets}
            liveAircraft={liveAircraft}
            liveShips={liveShips}
          />
        </div>

        {/* ── EVENT DETAIL PANEL (Premium Card) ── */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2100] flex items-end justify-center pb-6 px-6"
              onClick={() => setSelectedEventId(null)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass p-6 md:p-8 max-w-3xl w-full rounded-[2rem] shadow-[-20px_20px_60px_rgba(0,0,0,0.5)] overflow-hidden relative"
              >

                {/* Visual Flair */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--accent)] opacity-5 blur-[40px] rounded-full" />

                <div className="flex flex-col md:flex-row gap-6">
                  {selectedEvent.imageUrl && (
                    <div className="w-full md:w-64 h-44 md:h-auto rounded-2xl overflow-hidden border border-[var(--line)] flex-shrink-0 shadow-lg group">
                      <img
                        src={selectedEvent.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 overflow-y-auto max-h-[60vh] md:max-h-none">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[9px] font-black uppercase tracking-widest">{selectedEvent.category}</span>
                          <span className="text-[10px] font-mono opacity-30 flex items-center gap-1.5"><Clock size={12} /> {new Date(selectedEvent.timestamp).toLocaleString()}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{selectedEvent.title}</h2>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedEventId(null);
                        }}
                        className="p-3 hover:bg-[var(--line)] rounded-full transition-colors flex-shrink-0 relative z-[50]"
                        aria-label="Close detail"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <p className="text-sm md:text-base opacity-70 leading-relaxed mb-6 font-medium selection:bg-[var(--accent)] selection:text-white">
                      {selectedEvent.description}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-[var(--line)]">
                      <div className="flex items-center gap-3 text-xs font-bold opacity-50 uppercase tracking-widest">
                        <MapIcon size={16} className="text-[var(--accent)]" />
                        {selectedEvent.location.name}
                      </div>
                      {selectedEvent.sourceUrl && (
                        <a
                          href={selectedEvent.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-[var(--ink)] text-[var(--bg)] rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-[var(--accent)]/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          View Intel ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
