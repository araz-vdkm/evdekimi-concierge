import React, { useEffect, useRef, useState } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isBefore,
  isWithinInterval,
  format
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  /** Currently applied custom range, or null if none has been picked yet. */
  start: Date | null;
  end: Date | null;
  /** Whether this custom range is the one currently driving the page (vs. a preset pill). Controls the trigger button's highlighted state and label. */
  isActive: boolean;
  onApply: (start: Date, end: Date) => void;
  accent?: 'teal' | 'blue';
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * A booking.com-style date range picker: a pill button that opens a
 * two-month calendar popover. Click a start day, then an end day (or just
 * Apply right after the first click for a single-day range); the range
 * between is highlighted live as you hover before the end date is picked.
 */
export default function DateRangePicker({ start, end, isActive, onApply, accent = 'teal' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [anchorMonth, setAnchorMonth] = useState<Date>(startOfMonth(end || start || new Date()));
  const [pendingStart, setPendingStart] = useState<Date | null>(start);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(end);
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPendingStart(start);
    setPendingEnd(end);
    setAnchorMonth(startOfMonth(end || start || new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const accentClasses = {
    trigger: accent === 'teal' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-blue-50 text-blue-600 border-blue-200',
    day: accent === 'teal' ? 'bg-teal-600 text-white' : 'bg-blue-600 text-white',
    dayRange: accent === 'teal' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700',
    apply: accent === 'teal' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'
  };

  const handleDayClick = (day: Date) => {
    if (!pendingStart || pendingEnd) {
      setPendingStart(day);
      setPendingEnd(null);
      return;
    }
    if (isBefore(day, pendingStart)) {
      setPendingEnd(pendingStart);
      setPendingStart(day);
    } else {
      setPendingEnd(day);
    }
  };

  const handleApply = () => {
    if (!pendingStart) return;
    const s = new Date(pendingStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(pendingEnd || pendingStart);
    e.setHours(23, 59, 59, 999);
    onApply(s, e);
    setOpen(false);
  };

  const renderMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const previewEnd = pendingEnd || hoverDay;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="w-[248px]">
        <div className="text-center text-sm font-bold text-slate-700 mb-2">{format(month, 'MMMM yyyy')}</div>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-slate-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month);
            const isStart = !!pendingStart && isSameDay(day, pendingStart);
            const isEnd = !!pendingEnd && isSameDay(day, pendingEnd);
            const inRange =
              !!pendingStart &&
              !!previewEnd &&
              !isSameDay(pendingStart, previewEnd) &&
              isWithinInterval(day, {
                start: isBefore(pendingStart, previewEnd) ? pendingStart : previewEnd,
                end: isBefore(pendingStart, previewEnd) ? previewEnd : pendingStart
              });
            const isToday = isSameDay(day, today);
            return (
              <button
                type="button"
                key={day.toISOString()}
                disabled={!inMonth}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoverDay(day)}
                className={`h-8 text-[12.5px] rounded-md font-medium transition-colors ${
                  !inMonth
                    ? 'invisible'
                    : isStart || isEnd
                    ? accentClasses.day
                    : inRange
                    ? accentClasses.dayRange
                    : isToday
                    ? 'text-slate-900 font-bold hover:bg-slate-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const displayLabel =
    isActive && start && end
      ? isSameDay(start, end)
        ? format(start, 'MMM d, yyyy')
        : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
      : 'Custom range';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
          isActive ? accentClasses.trigger : 'bg-slate-100 text-slate-500 hover:text-slate-700 border-transparent'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        {displayLabel}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setAnchorMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Select a date range</div>
            <button
              type="button"
              onClick={() => setAnchorMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-6" onMouseLeave={() => setHoverDay(null)}>
            {renderMonth(anchorMonth)}
            {renderMonth(addMonths(anchorMonth, 1))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-3">
            <div className="text-[12.5px] text-slate-600 font-medium">
              {pendingStart
                ? pendingEnd
                  ? `${format(pendingStart, 'MMM d, yyyy')} – ${format(pendingEnd, 'MMM d, yyyy')}`
                  : `${format(pendingStart, 'MMM d, yyyy')} – pick an end date, or Apply for a single day`
                : 'Pick a start date'}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!pendingStart}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed ${accentClasses.apply}`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
