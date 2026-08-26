import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun', letter: 'S' },
  { id: 1, name: 'Monday', short: 'Mon', letter: 'M' },
  { id: 2, name: 'Tuesday', short: 'Tue', letter: 'T' },
  { id: 3, name: 'Wednesday', short: 'Wed', letter: 'W' },
  { id: 4, name: 'Thursday', short: 'Thu', letter: 'T' },
  { id: 5, name: 'Friday', short: 'Fri', letter: 'F' },
  { id: 6, name: 'Saturday', short: 'Sat', letter: 'S' }
];

const PRESET_SCHEDULES = [
  { label: 'Mon – Fri, 9 AM – 5 PM', days: [1,2,3,4,5], start: '09:00', end: '17:00' },
  { label: 'Mon – Sat, 10 AM – 6 PM', days: [1,2,3,4,5,6], start: '10:00', end: '18:00' },
  { label: 'Mon – Fri, 8 AM – 2 PM', days: [1,2,3,4,5], start: '08:00', end: '14:00' },
  { label: 'Weekdays + Sat morning', days: [1,2,3,4,5,6], start: '09:00', end: '13:00', satEnd: '13:00', weekdayEnd: '17:00' },
];

function formatTimeTo12h(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const disp = hour % 12 || 12;
  return `${disp}:${m || '00'} ${ampm}`;
}

function hoursFromRange(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function slotsFromRange(start, end, lunchStart, lunchEnd) {
  let total = Math.floor(hoursFromRange(start, end) * 2);
  if (lunchStart && lunchEnd) {
    total -= Math.floor(hoursFromRange(lunchStart, lunchEnd) * 2);
  }
  return Math.max(0, total);
}

function relativeDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0,0,0,0);
  const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return 'Next week';
  return `In ${Math.ceil(diff / 7)} weeks`;
}

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [originalSchedule, setOriginalSchedule] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef(null);

  // Exception form
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [addingException, setAddingException] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Close presets dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSchedule = async () => {
    try {
      const data = await apiFetch('/doctors/me/schedule');
      
      const formattedSchedule = DAYS_OF_WEEK.map(day => {
        const existing = data.schedule.find(s => s.day_of_week === day.id);
        return {
          dayOfWeek: day.id,
          name: day.name,
          short: day.short,
          letter: day.letter,
          isActive: !!existing,
          startTime: existing ? existing.start_time.slice(0,5) : '09:00',
          endTime: existing ? existing.end_time.slice(0,5) : '17:00',
          lunchStart: existing?.lunch_start ? existing.lunch_start.slice(0,5) : '',
          lunchEnd: existing?.lunch_end ? existing.lunch_end.slice(0,5) : '',
          hasLunch: !!(existing?.lunch_start && existing?.lunch_end),
          maxBookingsPerDay: existing?.max_bookings_per_day || '',
          slotDurationMinutes: existing?.slot_duration_minutes || 30,
          bufferMinutes: existing?.buffer_minutes || 0,
        };
      });
      
      setSchedule(formattedSchedule);
      setOriginalSchedule(JSON.parse(JSON.stringify(formattedSchedule)));
      setExceptions(data.exceptions || []);
    } catch (error) {
      toast('Failed to load schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(originalSchedule);
  }, [schedule, originalSchedule]);

  const stats = useMemo(() => {
    const activeDays = schedule.filter(d => d.isActive);
    const totalHours = activeDays.reduce((sum, d) => {
      let h = hoursFromRange(d.startTime, d.endTime);
      if (d.hasLunch && d.lunchStart && d.lunchEnd) h -= hoursFromRange(d.lunchStart, d.lunchEnd);
      return sum + Math.max(0, h);
    }, 0);
    const totalSlots = activeDays.reduce((sum, d) => sum + slotsFromRange(d.startTime, d.endTime, d.hasLunch ? d.lunchStart : null, d.hasLunch ? d.lunchEnd : null), 0);
    const totalMaxBookings = activeDays.reduce((sum, d) => sum + (d.maxBookingsPerDay ? Number(d.maxBookingsPerDay) : slotsFromRange(d.startTime, d.endTime, d.hasLunch ? d.lunchStart : null, d.hasLunch ? d.lunchEnd : null)), 0);
    return { activeDays: activeDays.length, totalHours, totalSlots, totalMaxBookings };
  }, [schedule]);

  const handleScheduleChange = useCallback((dayId, field, value) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayId ? { ...day, [field]: value } : day
    ));
  }, []);

  const applyPreset = useCallback((preset) => {
    setSchedule(prev => prev.map(day => {
      const isInPreset = preset.days.includes(day.dayOfWeek);
      if (!isInPreset) return { ...day, isActive: false };
      
      let endTime = preset.end;
      if (preset.satEnd && day.dayOfWeek === 6) endTime = preset.satEnd;
      else if (preset.weekdayEnd && day.dayOfWeek !== 6) endTime = preset.weekdayEnd;

      return { ...day, isActive: true, startTime: preset.start, endTime, lunchStart: day.lunchStart, lunchEnd: day.lunchEnd, hasLunch: day.hasLunch, maxBookingsPerDay: day.maxBookingsPerDay };
    }));
    setShowPresets(false);
    toast('Preset applied — review and save when ready', 'success');
  }, [toast]);

  const copyToAll = useCallback((sourceDayId) => {
    const source = schedule.find(d => d.dayOfWeek === sourceDayId);
    if (!source || !source.isActive) return;
    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === sourceDayId ? day : { ...day, isActive: true, startTime: source.startTime, endTime: source.endTime, lunchStart: source.lunchStart, lunchEnd: source.lunchEnd, hasLunch: source.hasLunch, maxBookingsPerDay: source.maxBookingsPerDay }
    ));
    toast(`Copied ${source.short}'s hours to all days`, 'success');
  }, [schedule, toast]);

  const handleSaveSchedule = async () => {
    // Validate times
    const invalid = schedule.find(d => d.isActive && d.startTime >= d.endTime);
    if (invalid) {
      toast(`${invalid.name}: end time must be after start time`, 'error');
      return;
    }
    const invalidLunch = schedule.find(d => d.isActive && d.hasLunch && d.lunchStart && d.lunchEnd && (d.lunchStart >= d.lunchEnd || d.lunchStart < d.startTime || d.lunchEnd > d.endTime));
    if (invalidLunch) {
      toast(`${invalidLunch.name}: lunch break must be within working hours`, 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schedule: schedule.filter(d => d.isActive).map(d => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          lunchStart: d.hasLunch && d.lunchStart ? d.lunchStart : null,
          lunchEnd: d.hasLunch && d.lunchEnd ? d.lunchEnd : null,
          maxBookingsPerDay: d.maxBookingsPerDay ? Number(d.maxBookingsPerDay) : null,
          slotDurationMinutes: Number(d.slotDurationMinutes) || 30,
          bufferMinutes: Number(d.bufferMinutes) || 0,
        }))
      };
      
      await apiFetch('/doctors/me/schedule', { method: 'PUT', body: payload });
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
      toast('Weekly schedule saved successfully', 'success');
    } catch (error) {
      toast('Failed to save schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async (e) => {
    e.preventDefault();
    if (!exceptionDate) return;
    
    setAddingException(true);
    try {
      const data = await apiFetch('/doctors/me/exceptions', {
        method: 'POST',
        body: { exceptionDate, isAvailable: false, reason: exceptionReason }
      });
      
      setExceptions(prev => [...prev, data].sort((a, b) => new Date(a.exception_date) - new Date(b.exception_date)));
      setExceptionDate('');
      setExceptionReason('');
      toast('Time off added successfully', 'success');
    } catch (error) {
      toast('Failed to add time off', 'error');
    } finally {
      setAddingException(false);
    }
  };

  const handleRemoveException = async (id) => {
    try {
      await apiFetch(`/doctors/me/exceptions/${id}`, { method: 'DELETE' });
      setExceptions(prev => prev.filter(e => e.id !== id));
      toast('Time off removed', 'success');
    } catch (error) {
      toast('Failed to remove time off', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-aubergine-200 border-t-aubergine-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 font-medium text-sm">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  const todayDay = new Date().getDay();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-calendar-alt text-aubergine-600 text-xl"></i>
            My Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your weekly availability and manage time off. Patients book slots based on this schedule.
          </p>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
            <i className="fas fa-exclamation-circle"></i>
            Unsaved changes
          </div>
        )}
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-aubergine-100 flex items-center justify-center text-aubergine-600">
              <i className="fas fa-calendar-check text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.activeDays}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Working Days</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <i className="fas fa-clock text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.totalHours}<span className="text-sm font-bold text-slate-400">h</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Hours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <i className="fas fa-user-clock text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.totalSlots}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slots / Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Week Overview ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Overview</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {stats.activeDays === 0 ? 'No working days set' :
             `${schedule.filter(d => d.isActive).map(d => d.short).join(', ')}`}
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-2">
            {schedule.map(day => {
              const hours = day.isActive ? hoursFromRange(day.startTime, day.endTime) : 0;
              const slots = day.isActive ? slotsFromRange(day.startTime, day.endTime) : 0;
              const isToday = day.dayOfWeek === todayDay;
              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => handleScheduleChange(day.dayOfWeek, 'isActive', !day.isActive)}
                  className={`
                    relative flex flex-col items-center rounded-xl p-2 sm:p-3 transition-all duration-200 cursor-pointer border-2 group
                    ${day.isActive
                      ? isToday
                        ? 'bg-aubergine-600 border-aubergine-600 text-white shadow-lg shadow-aubergine-500/25'
                        : 'bg-aubergine-50 border-aubergine-200 text-aubergine-800 hover:bg-aubergine-100 hover:border-aubergine-300'
                      : isToday
                        ? 'bg-slate-100 border-slate-300 text-slate-500'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100 hover:border-slate-200'
                    }
                  `}
                  title={day.isActive ? `${day.name}: ${formatTimeTo12h(day.startTime)} – ${formatTimeTo12h(day.endTime)}` : `${day.name}: Off`}
                >
                  {isToday && (
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${day.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-wider ${day.isActive ? (isToday ? 'text-white/80' : 'text-aubergine-500') : 'text-slate-400'}`}>
                    {day.short}
                  </span>
                  {day.isActive ? (
                    <>
                      <span className={`text-lg sm:text-xl font-black mt-0.5 ${isToday ? 'text-white' : 'text-aubergine-700'}`}>{hours}h</span>
                      <span className={`text-[9px] font-bold mt-0.5 ${isToday ? 'text-white/70' : 'text-aubergine-400'}`}>
                        {slots} slots
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg sm:text-xl font-black mt-0.5 text-slate-300">—</span>
                      <span className="text-[9px] font-bold mt-0.5 text-slate-300">Off</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Detailed Schedule Editor ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/80">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <i className="fas fa-calendar-week text-aubergine-600"></i> Weekly Availability
              </h2>
              <div className="flex items-center gap-2">
                {/* Quick Presets */}
                <div className="relative" ref={presetsRef}>
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-xs font-bold text-slate-500 hover:text-aubergine-600 bg-white border border-slate-200 hover:border-aubergine-300 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-wand-magic-sparkles text-[10px]"></i> Quick Presets
                    <i className={`fas fa-chevron-down text-[8px] transition-transform ${showPresets ? 'rotate-180' : ''}`}></i>
                  </button>
                  {showPresets && (
                    <div className="absolute right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-20 w-64 overflow-hidden animate-slide-up">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apply a Preset</p>
                      </div>
                      {PRESET_SCHEDULES.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => applyPreset(preset)}
                          className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-aubergine-50 hover:text-aubergine-700 transition-colors border-b border-slate-50 last:border-b-0 flex items-center gap-2"
                        >
                          <i className="fas fa-bolt text-aubergine-400 text-xs"></i>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1">
              {schedule.map(day => {
                const isToday = day.dayOfWeek === todayDay;
                let hours = day.isActive ? hoursFromRange(day.startTime, day.endTime) : 0;
                if (day.isActive && day.hasLunch && day.lunchStart && day.lunchEnd) hours -= hoursFromRange(day.lunchStart, day.lunchEnd);
                hours = Math.max(0, hours);
                const slots = day.isActive ? slotsFromRange(day.startTime, day.endTime, day.hasLunch ? day.lunchStart : null, day.hasLunch ? day.lunchEnd : null) : 0;
                const timeError = day.isActive && day.startTime >= day.endTime;

                return (
                  <div
                    key={day.dayOfWeek}
                    className={`
                      p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 group
                      ${day.isActive ? (isToday ? 'bg-aubergine-50/30' : 'bg-white') : 'bg-slate-50/60'}
                      ${isToday ? 'border-l-[3px] border-l-aubergine-500' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Toggle */}
                      <button 
                        onClick={() => handleScheduleChange(day.dayOfWeek, 'isActive', !day.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aubergine-500 flex-shrink-0 ${day.isActive ? 'bg-aubergine-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${day.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>

                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold w-[5.5rem] truncate text-sm ${day.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-aubergine-100 text-aubergine-600 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                    </div>

                    {day.isActive ? (
                      <div className="flex-1 ml-14 sm:ml-0 space-y-2">
                        {/* Working hours row */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={day.startTime}
                              onChange={(e) => handleScheduleChange(day.dayOfWeek, 'startTime', e.target.value)}
                              className={`px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white ${timeError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
                            />
                            <span className="text-slate-400 text-xs font-bold">→</span>
                            <input 
                              type="time" 
                              value={day.endTime}
                              onChange={(e) => handleScheduleChange(day.dayOfWeek, 'endTime', e.target.value)}
                              className={`px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white ${timeError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
                            />
                          </div>

                          {!timeError && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md flex-shrink-0 hidden sm:inline-flex items-center gap-1">
                              <i className="fas fa-clock text-[8px]"></i> {hours}h · {slots} slots
                            </span>
                          )}
                          {timeError && (
                            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                              <i className="fas fa-exclamation-triangle"></i> Invalid
                            </span>
                          )}

                          <button
                            onClick={() => copyToAll(day.dayOfWeek)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-aubergine-600 hover:bg-aubergine-50 transition-colors opacity-0 group-hover:opacity-100"
                            title={`Copy ${day.short}'s settings to all days`}
                          >
                            <i className="fas fa-copy text-xs"></i>
                          </button>
                        </div>

                        {/* Advanced Settings */}
                        <details className="w-full group/details">
                          <summary className="text-[11px] font-bold text-slate-400 cursor-pointer list-none hover:text-aubergine-600 transition-colors flex items-center gap-1.5 select-none w-max">
                            <i className="fas fa-sliders-h text-[10px]"></i> Advanced Options
                            <i className="fas fa-chevron-down text-[9px] transition-transform group-open/details:-rotate-180"></i>
                          </summary>
                          
                          <div className="pt-3 flex items-center gap-4 flex-wrap bg-slate-50/50 p-3 rounded-xl border border-slate-100 mt-2">
                            {/* Lunch toggle + inputs */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleScheduleChange(day.dayOfWeek, 'hasLunch', !day.hasLunch)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                  day.hasLunch
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm'
                                }`}
                              >
                                <i className={`fas fa-utensils text-[10px]`}></i>
                                Lunch
                              </button>
                              {day.hasLunch && (
                                <div className="flex items-center gap-1.5 animate-slide-up">
                                  <input
                                    type="time"
                                    value={day.lunchStart}
                                    onChange={(e) => handleScheduleChange(day.dayOfWeek, 'lunchStart', e.target.value)}
                                    className="px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50 w-[5.5rem]"
                                  />
                                  <span className="text-slate-300 text-[10px] font-bold">→</span>
                                  <input
                                    type="time"
                                    value={day.lunchEnd}
                                    onChange={(e) => handleScheduleChange(day.dayOfWeek, 'lunchEnd', e.target.value)}
                                    className="px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50 w-[5.5rem]"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                            {/* Max bookings */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">
                                Max Patients/day
                              </span>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                placeholder="∞"
                                value={day.maxBookingsPerDay}
                                onChange={(e) => handleScheduleChange(day.dayOfWeek, 'maxBookingsPerDay', e.target.value)}
                                className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white placeholder:text-slate-300 shadow-sm"
                              />
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                            {/* Slot Duration */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">
                                Slot (min)
                              </span>
                              <input
                                type="number"
                                min="10"
                                max="120"
                                step="5"
                                value={day.slotDurationMinutes}
                                onChange={(e) => handleScheduleChange(day.dayOfWeek, 'slotDurationMinutes', e.target.value)}
                                className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white shadow-sm"
                              />
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                            {/* Buffer Duration */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">
                                Gap (min)
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                step="5"
                                value={day.bufferMinutes}
                                onChange={(e) => handleScheduleChange(day.dayOfWeek, 'bufferMinutes', e.target.value)}
                                className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white shadow-sm"
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 font-medium italic ml-14 sm:ml-0 flex items-center gap-2">
                        <i className="fas fa-moon text-slate-300 text-xs"></i> Day off
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-[11px] text-slate-400 font-medium">
                <i className="fas fa-info-circle mr-1"></i>
                Each slot is 30 minutes. Patients see available slots based on this schedule.
              </p>
              <button 
                onClick={handleSaveSchedule}
                disabled={saving || !hasUnsavedChanges}
                className={`
                  font-bold py-2.5 px-6 rounded-xl transition-all text-sm flex items-center gap-2 shadow-md
                  ${hasUnsavedChanges
                    ? 'bg-aubergine-600 hover:bg-aubergine-700 text-white shadow-aubergine-500/20 disabled:opacity-50'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                `}
              >
                {saving ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Saving...</>
                ) : hasUnsavedChanges ? (
                  <><i className="fas fa-save"></i> Save Schedule</>
                ) : (
                  <><i className="fas fa-check-circle"></i> Up to date</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Time Off Sidebar ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <i className="fas fa-plane-departure text-rose-500"></i> Time Off
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Block specific dates so patients can't book.
              </p>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleAddException} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date *</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-300 bg-white transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Vacation, Conference"
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-300 bg-white transition-shadow placeholder:text-slate-300"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!exceptionDate || addingException}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingException ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> Adding...</>
                  ) : (
                    <><i className="fas fa-plus"></i> Block Date</>
                  )}
                </button>
              </form>
            </div>

            <div className="border-t border-slate-100">
              <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Time Off</span>
                {exceptions.length > 0 && (
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 w-5 h-5 rounded-full flex items-center justify-center">
                    {exceptions.length}
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto">
                {exceptions.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-calendar-check text-slate-300 text-lg"></i>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No time off scheduled</p>
                    <p className="text-slate-300 text-xs mt-0.5">You're available on all working days.</p>
                  </div>
                ) : (
                  exceptions.map(exc => {
                    const dateObj = new Date(exc.exception_date + 'T00:00:00');
                    const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                    const rel = relativeDate(exc.exception_date);

                    return (
                      <div key={exc.id} className="p-4 flex items-center justify-between hover:bg-rose-50/40 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0">
                            <i className="fas fa-calendar-xmark text-sm"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{formatted}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">{rel}</span>
                              {exc.reason && <span className="text-[11px] text-slate-400 truncate">· {exc.reason}</span>}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveException(exc.id)}
                          className="text-slate-300 hover:text-rose-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Remove time off"
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
