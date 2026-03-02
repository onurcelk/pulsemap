import React from 'react';
import { MapEvent } from '../types';
import { formatDistanceToNow } from 'date-fns';
import {
  Crosshair,
  Flame,
  Users,
  Landmark,
  Heart,
  Info,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EventCardProps {
  event: MapEvent;
  isSelected?: boolean;
  onClick?: (event: MapEvent) => void;
}

const CATEGORY_ICONS = {
  military: Crosshair,
  explosion: Flame,
  protest: Users,
  politics: Landmark,
  humanitarian: Heart,
  other: Info,
};

const CATEGORY_COLORS = {
  military: 'text-red-500 bg-red-500/10 border-red-500/20',
  explosion: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  protest: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  politics: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  humanitarian: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  other: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

const CATEGORY_STRIP = {
  military: 'bg-red-500',
  explosion: 'bg-orange-500',
  protest: 'bg-blue-500',
  politics: 'bg-purple-500',
  humanitarian: 'bg-emerald-500',
  other: 'bg-gray-400',
};

export const EventCard: React.FC<EventCardProps> = ({ event, isSelected, onClick }) => {
  const Icon = CATEGORY_ICONS[event.category] || Info;
  const colorClass = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
  const stripClass = CATEGORY_STRIP[event.category] || CATEGORY_STRIP.other;
  const hotScore = event.hotScore ?? 1;
  const isHot = hotScore >= 3;
  const isVeryHot = hotScore >= 6;

  // Extract domain for favicon
  let sourceDomain = "news.google.com";
  try {
    if (event.sourceUrl) {
      sourceDomain = new URL(event.sourceUrl).hostname;
    }
  } catch (e) { }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(event); }}
      aria-pressed={isSelected}
      style={isVeryHot ? {
        animation: 'card-hot-pulse 2s ease-in-out infinite',
      } : undefined}
      className={[
        "p-4 cursor-pointer transition-all duration-300 relative overflow-hidden outline-none border-l-4 group",
        isSelected
          ? "bg-[var(--line)] border-l-[var(--accent)]"
          : isVeryHot
            ? "border-l-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            : isHot
              ? "border-l-orange-500 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.10)]"
              : "border-l-transparent hover:border-l-[var(--line)]",
      ].join(' ')}
    >
      {/* ── Background Detail (Lines) ── */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--line)]/20 to-transparent pointer-events-none" />

      <div className="flex gap-4">
        {/* Visual ID Strip */}
        <div className="flex flex-col items-center gap-2">
          <div className={`p-2 rounded-xl border ${colorClass} shadow-inner transition-transform group-hover:scale-110 ${isVeryHot ? 'ring-2 ring-orange-500/50 ring-offset-1 ring-offset-transparent' : ''}`}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <div className={`w-[2px] flex-1 rounded-full opacity-20 ${stripClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img
                src={`https://www.google.com/s2/favicons?sz=64&domain=${sourceDomain}`}
                alt=""
                className="w-3.5 h-3.5 rounded-sm opacity-60 grayscale group-hover:grayscale-0 transition-all"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="text-[10px] sm:text-[11px] font-mono leading-none opacity-50 uppercase tracking-widest truncate max-w-[120px]">
                {sourceDomain.replace('www.', '').split('.')[0]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isHot && (
                <span
                  className={`text-[10px] xl:text-[11px] font-black font-mono px-2 py-0.5 rounded-md tracking-wide flex items-center gap-1 ${isVeryHot ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}
                  title={`${hotScore} sources reported this story`}
                >
                  🔥{hotScore}
                </span>
              )}
              <div className="flex items-center gap-1 text-[10px] xl:text-[11px] font-mono opacity-40 group-hover:opacity-60 transition-opacity">
                <Clock size={12} />
                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
              </div>
            </div>
          </div>

          <h3 className={`font-bold text-base md:text-lg tracking-tight leading-snug mb-2 line-clamp-3 group-hover:text-[var(--accent)] transition-colors ${isHot ? 'text-[var(--ink)]' : ''}`}>
            {event.title}
          </h3>

          <p className="text-sm text-dim line-clamp-3 leading-relaxed opacity-80 mb-3 font-medium">
            {event.description}
          </p>

          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 pt-3 border-t border-[var(--line)]/50 mt-3">

                  {/* Show grouped related stories if they exist */}
                  {(event as any).relatedStories && (event as any).relatedStories.length > 1 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                      <span className="text-[10px] xl:text-xs font-mono font-bold uppercase tracking-widest opacity-50 mb-1">
                        Related Sources ({(event as any).relatedStories.length})
                      </span>
                      {/* Skip the first story as it's the main headline of the card itself */}
                      {(event as any).relatedStories.slice(1).map((story: any, idx: number) => (
                        <a
                          key={idx}
                          href={story.sourceUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 rounded border border-[var(--line)]/30 hover:border-[var(--line)] bg-[var(--line)]/5 hover:bg-[var(--line)]/10 transition-all flex flex-col gap-1.5 group/story"
                        >
                          <p className="text-xs xl:text-sm leading-snug line-clamp-2 text-[var(--ink-dim)] group-hover/story:text-[var(--ink)] font-medium">
                            {story.title}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[9px] xl:text-[10px] font-mono opacity-60 font-bold">{story.source}</span>
                            <span className="text-[9px] xl:text-[10px] font-mono opacity-50">{new Date(story.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between w-full mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] xl:text-xs font-mono opacity-50 font-medium">
                      <MapPin size={12} className="text-[var(--accent)]" />
                      {event.location.name}
                    </div>
                    {event.sourceUrl && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-[11px] xl:text-xs font-bold text-[var(--accent)] hover:underline"
                      >
                        MAIN SOURCE
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-20 transition-opacity">
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
