import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch, getTokens } from '../../lib/apiClient.js';
import { Modal } from '../../components/Modal.jsx';

const SCHEDULE_PRESETS = [
  { label: 'Every 5 Minutes', expr: '*/5 * * * *' },
  { label: 'Every 15 Minutes', expr: '0 */15 * * * *' },
  { label: 'Every Hour', expr: '0 * * * *' },
  { label: 'Daily at 7:00 AM', expr: '0 7 * * *' },
  { label: 'Daily at 7:45 AM', expr: '0 45 7 * * *' },
  { label: 'Daily at 9:00 AM', expr: '0 9 * * *' },
  { label: 'Daily at 10:00 AM', expr: '0 10 * * *' },
  { label: 'Daily at 11:00 AM', expr: '0 11 * * *' },
  { label: 'Daily at 2:00 AM (Midnight)', expr: '0 2 * * *' },
  { label: 'Daily at Midnight (00:00)', expr: '0 0 * * *' },
  { label: 'Weekly (Mondays 12:00 PM)', expr: '0 0 12 * * 1' },
];

/**
 * Dynamically parses and converts any 5-part or 6-part cron expression into human-readable English.
 */
function humanizeSchedule(expr) {
  if (!expr || typeof expr !== 'string') return 'Custom Interval';
  const parts = expr.trim().split(/\s+/);

  let min, hour, dom, mon, dow;
  if (parts.length === 6) {
    [, min, hour, dom, mon, dow] = parts;
  } else if (parts.length === 5) {
    [min, hour, dom, mon, dow] = parts;
  } else {
    return `Schedule: ${expr}`;
  }

  const daysOfWeekMap = {
    '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
    'SUN': 'Sun', 'MON': 'Mon', 'TUE': 'Tue', 'WED': 'Wed', 'THU': 'Thu', 'FRI': 'Fri', 'SAT': 'Sat',
  };

  const formatTime = (h, m) => {
    const numH = parseInt(h, 10);
    const numM = parseInt(m, 10);
    if (isNaN(numH) || isNaN(numM)) return `${h}:${m}`;
    const period = numH >= 12 ? 'PM' : 'AM';
    const displayH = numH % 12 === 0 ? 12 : numH % 12;
    const displayM = numM < 10 ? `0${numM}` : numM;
    return `${displayH}:${displayM} ${period}`;
  };

  // Every X minutes: */N * * * *
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    const interval = min.slice(2);
    return interval === '1' ? 'Every minute' : `Every ${interval} mins`;
  }

  // Every X hours: 0 */N * * *
  if ((min === '0' || min === '00') && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    const interval = hour.slice(2);
    return interval === '1' ? 'Every hour' : `Every ${interval} hours`;
  }

  // Hourly at minute X: M * * * *
  if (!isNaN(parseInt(min, 10)) && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return min === '0' ? 'Every hour on the hour' : `Hourly at minute ${min}`;
  }

  // Daily or weekly at specific time: M H * * DOW
  if (!isNaN(parseInt(min, 10)) && !isNaN(parseInt(hour, 10)) && dom === '*' && mon === '*') {
    const timeStr = formatTime(hour, min);
    if (dow === '*') {
      return `Daily at ${timeStr}`;
    }
    if (dow === '1-5' || dow === 'MON-FRI') {
      return `Mon–Fri at ${timeStr}`;
    }
    if (dow === '0,6' || dow === '6,0' || dow === 'SAT,SUN') {
      return `Weekends at ${timeStr}`;
    }
    if (dow.includes(',')) {
      const days = dow.split(',').map(d => daysOfWeekMap[d.trim()] || d).join(', ');
      return `Every ${days} at ${timeStr}`;
    }
    if (dow.includes('-')) {
      const [start, end] = dow.split('-');
      return `${daysOfWeekMap[start] || start}–${daysOfWeekMap[end] || end} at ${timeStr}`;
    }
    if (daysOfWeekMap[dow]) {
      return `Every ${daysOfWeekMap[dow]} at ${timeStr}`;
    }
  }

  // Monthly on specific day: M H D * *
  if (!isNaN(parseInt(min, 10)) && !isNaN(parseInt(hour, 10)) && !isNaN(parseInt(dom, 10)) && mon === '*' && dow === '*') {
    const timeStr = formatTime(hour, min);
    return `Monthly on day ${dom} at ${timeStr}`;
  }

  // Every minute: * * * * *
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Every minute';
  }

  return `Custom: ${expr}`;
}

export default function CronManager() {
  const toast = useToast();
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [runningAction, setRunningAction] = useState({});
  const [editingCron, setEditingCron] = useState(null);
  const [customExpr, setCustomExpr] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedJobLogs, setSelectedJobLogs] = useState(null);

  const loadLogs = async (jobName = null) => {
    try {
      setLoadingLogs(true);
      setSelectedJobLogs(jobName);
      setLogsModalOpen(true);
      const url = jobName ? `/admin/crons/${jobName}/logs` : '/admin/crons/logs';
      const res = await apiFetch(url);
      setLogs(Array.isArray(res) ? res : (res?.data || []));
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadCrons = async (silent = false) => {
    try {
      const tokens = getTokens();
      if (!tokens?.accessToken) return;
      if (!silent) setLoading(true);
      const data = await apiFetch('/admin/crons');
      if (Array.isArray(data)) {
        setCrons(data);
      } else if (data && Array.isArray(data.data)) {
        setCrons(data.data);
      }
    } catch (err) {
      if (!silent) toast(err.message || 'Failed to load cron jobs', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadCrons();
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadCrons(true);
    }, 20000); // 20-second dynamic live polling
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleToggle = async (cron) => {
    const nextState = !cron.running;
    setRunningAction(prev => ({ ...prev, [cron.name]: 'toggling' }));
    try {
      const res = await apiFetch(`/admin/crons/${cron.name}/toggle`, {
        method: 'POST',
        body: { running: nextState },
      });
      toast(res.message || `Cron job '${cron.displayName}' updated!`, 'success');
      setCrons(prev => prev.map(c => c.name === cron.name ? { ...c, running: nextState } : c));
    } catch (err) {
      toast(err.message || 'Failed to toggle cron job', 'error');
    } finally {
      setRunningAction(prev => ({ ...prev, [cron.name]: null }));
    }
  };

  const handleRunNow = async (cron) => {
    setRunningAction(prev => ({ ...prev, [cron.name]: 'running' }));
    try {
      await apiFetch(`/admin/crons/${cron.name}/run`, {
        method: 'POST',
      });
      toast(`⚡ ${cron.displayName} executed successfully!`, 'success');
      await loadCrons();
    } catch (err) {
      toast(err.message || 'Failed to execute cron job', 'error');
    } finally {
      setRunningAction(prev => ({ ...prev, [cron.name]: null }));
    }
  };

  const handleSaveSchedule = async () => {
    if (!editingCron || !customExpr.trim()) return;
    try {
      const res = await apiFetch(`/admin/crons/${editingCron.name}/schedule`, {
        method: 'PUT',
        body: { expression: customExpr.trim() },
      });
      toast(`Schedule updated to '${customExpr.trim()}'`, 'success');
      setCrons(prev => prev.map(c => c.name === editingCron.name ? { ...c, expression: customExpr.trim(), nextRun: res?.nextRun || c.nextRun } : c));
      setEditingCron(null);
    } catch (err) {
      toast(err.message || 'Failed to update schedule. Check cron syntax.', 'error');
    }
  };

  const categories = ['All', 'Patient', 'Doctor', 'Billing', 'Appointments', 'Admin'];

  const filteredCrons = crons.filter(c => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = crons.filter(c => c.running).length;
  const pausedCount = crons.filter(c => !c.running).length;

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Patient':
        return 'bg-aubergine-50 text-aubergine-700 border-aubergine-200';
      case 'Doctor':
        return 'bg-magenta-50 text-magenta-700 border-magenta-200';
      case 'Billing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Appointments':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Admin':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cron Jobs & Background Automations</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
              Admin Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time management, scheduling, pause/resume controls, and manual execution triggers for platform background services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle (Table / Grid) */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              title="Table View"
            >
              <i className="fas fa-table-list"></i>
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              title="Grid View"
            >
              <i className="fas fa-grip"></i>
              <span>Grid</span>
            </button>
          </div>

          {/* Live Auto-Sync Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-sm ${autoRefresh ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            title={autoRefresh ? 'Live Auto-Sync Active (Every 20s)' : 'Live Auto-Sync Paused'}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span>{autoRefresh ? 'Live Sync' : 'Sync Off'}</span>
          </button>

          {/* View Audit Logs Button */}
          <button
            onClick={() => loadLogs(null)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm hover:shadow"
            title="View Execution History & Audit Trail"
          >
            <i className="fas fa-clock-rotate-left text-slate-400"></i>
            <span>Audit Logs</span>
          </button>

          <button
            onClick={() => loadCrons(false)}
            disabled={loading}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm hover:shadow"
          >
            <i className={`fas fa-rotate ${loading ? 'fa-spin text-purple-600' : 'text-slate-400'}`}></i>
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base">
            <i className="fas fa-cubes-stacked"></i>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Services</span>
            <span className="text-lg font-black text-slate-800">{crons.length} Jobs</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
            <i className="fas fa-circle-play"></i>
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Active (Running)</span>
            <span className="text-lg font-black text-slate-800">{activeCount} Jobs</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
            <i className="fas fa-circle-pause"></i>
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">Paused (Stopped)</span>
            <span className="text-lg font-black text-slate-800">{pausedCount} Jobs</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aubergine-50 text-aubergine-600 flex items-center justify-center font-bold text-base">
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <span className="text-[10px] font-black text-aubergine-600 uppercase tracking-wider block">Concurrency Guard</span>
            <span className="text-xs font-bold text-slate-700">Atomic Claims Active</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search automation jobs..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
        </div>
      </div>

      {/* Main Content: Table View or Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-bold">Automation / Service</th>
                  <th className="px-4 py-3.5 font-bold">Category</th>
                  <th className="px-4 py-3.5 font-bold">Cron Schedule</th>
                  <th className="px-4 py-3.5 font-bold">Next Execution</th>
                  <th className="px-4 py-3.5 font-bold">Last Run</th>
                  <th className="px-4 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && crons.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="7" className="px-5 py-4">
                        <div className="animate-pulse flex items-center gap-3">
                          <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredCrons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg">
                          <i className="fas fa-magnifying-glass"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-700">No background automations found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search query or category filter.</p>
                        {(selectedCategory !== 'All' || searchQuery) && (
                          <button
                            onClick={() => {
                              setSelectedCategory('All');
                              setSearchQuery('');
                            }}
                            className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCrons.map(cron => {
                    const isToggling = runningAction[cron.name] === 'toggling';
                    const isRunning = runningAction[cron.name] === 'running';

                    return (
                      <tr
                        key={cron.name}
                        className={`hover:bg-slate-50/70 transition-colors group ${!cron.running ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* Service / Job Info */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${cron.running ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-amber-400'}`}
                              title={cron.running ? 'Active & Scheduled' : 'Paused'}
                            ></span>
                            <div>
                              <p className="font-bold text-slate-800 text-sm group-hover:text-purple-900 transition-colors">
                                {cron.displayName}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                {cron.name}
                              </span>
                              <p className="text-xs text-slate-500 leading-snug mt-1 line-clamp-2">
                                {cron.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4 whitespace-nowrap align-top pt-5">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border ${getCategoryBadgeClass(cron.category)}`}>
                            {cron.category}
                          </span>
                        </td>

                        {/* Schedule Expression & Humanized Label */}
                        <td className="px-4 py-4 align-top pt-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block">
                              {cron.expression}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 block">
                              {humanizeSchedule(cron.expression)}
                            </span>
                          </div>
                        </td>

                        {/* Next Execution */}
                        <td className="px-4 py-4 align-top pt-4 whitespace-nowrap">
                          {cron.nextRun ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs text-slate-800 font-bold block">
                                {new Date(cron.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                {new Date(cron.nextRun).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Paused / None</span>
                          )}
                        </td>

                        {/* Last Run */}
                        <td className="px-4 py-4 align-top pt-4 whitespace-nowrap">
                          {cron.lastRun ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs text-slate-700 font-medium block">
                                {new Date(cron.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {new Date(cron.lastRun).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-4 align-top pt-5 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cron.running ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          >
                            {cron.running ? 'Active' : 'Paused'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 align-top pt-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pause / Resume Button */}
                            <button
                              onClick={() => handleToggle(cron)}
                              disabled={isToggling}
                              className={`p-2 rounded-xl text-xs font-bold border transition-all ${cron.running ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                              title={cron.running ? 'Pause this job' : 'Resume this job'}
                            >
                              <i className={`fas ${isToggling ? 'fa-spinner fa-spin' : cron.running ? 'fa-pause' : 'fa-play'}`}></i>
                            </button>

                            {/* Edit Schedule Button */}
                            <button
                              onClick={() => {
                                setEditingCron(cron);
                                setCustomExpr(cron.expression);
                              }}
                              className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                              title="Edit Schedule"
                            >
                              <i className="fas fa-clock text-[10px] text-slate-400"></i>
                              <span>Schedule</span>
                            </button>

                            {/* Run Now Button */}
                            <button
                              onClick={() => handleRunNow(cron)}
                              disabled={isRunning}
                              className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                              title="Execute immediately on-demand"
                            >
                              <i className={`fas ${isRunning ? 'fa-rotate fa-spin text-purple-400' : 'fa-bolt text-amber-400'}`}></i>
                              <span>{isRunning ? 'Running' : 'Run Now'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cron Job Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCrons.map(cron => {
            const isToggling = runningAction[cron.name] === 'toggling';
            const isRunning = runningAction[cron.name] === 'running';

            return (
              <div
                key={cron.name}
                className={`bg-white rounded-2xl p-5 border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between gap-4 ${cron.running ? 'border-slate-200' : 'border-amber-200/80 bg-amber-50/10'}`}
              >
                <div>
                  {/* Header Strip */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cron.running ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-amber-400'}`}></span>
                        <h3 className="font-bold text-slate-800 text-sm">{cron.displayName}</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{cron.name}</span>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider border ${getCategoryBadgeClass(cron.category)}`}>
                      {cron.category}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-3">
                    {cron.description}
                  </p>

                  {/* Schedule Pill & Timestamps */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Cron Schedule:</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 inline-block">
                          {cron.expression}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{humanizeSchedule(cron.expression)}</span>
                      </div>
                    </div>

                    {cron.nextRun && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Next Execution:</span>
                        <span className="font-mono text-slate-700 font-bold">
                          {new Date(cron.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} ({new Date(cron.nextRun).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                        </span>
                      </div>
                    )}

                    {cron.lastRun && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Last Executed:</span>
                        <span className="text-slate-500 font-medium">
                          {new Date(cron.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggle(cron)}
                    disabled={isToggling}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${cron.running ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                  >
                    <i className={`fas ${cron.running ? 'fa-pause' : 'fa-play'}`}></i>
                    <span>{cron.running ? 'Pause Job' : 'Resume Job'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Edit Schedule */}
                    <button
                      onClick={() => {
                        setEditingCron(cron);
                        setCustomExpr(cron.expression);
                      }}
                      className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fas fa-pen-to-square text-[10px] text-slate-400"></i>
                      <span>Schedule</span>
                    </button>

                    {/* Run Now Trigger */}
                    <button
                      onClick={() => handleRunNow(cron)}
                      disabled={isRunning}
                      className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <i className={`fas ${isRunning ? 'fa-rotate fa-spin' : 'fa-bolt text-amber-400'}`}></i>
                      <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Schedule Modal */}
      {editingCron && (
        <Modal
          isOpen={Boolean(editingCron)}
          onClose={() => setEditingCron(null)}
          title={`Edit Schedule: ${editingCron.displayName}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Select a standard preset frequency or enter a custom 5-part cron expression.
              </p>

              {/* Preset Chips */}
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Frequency Presets
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {SCHEDULE_PRESETS.map(p => (
                  <button
                    key={p.expr}
                    onClick={() => setCustomExpr(p.expr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${customExpr === p.expr ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Expression Input */}
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                Cron Expression (Standard 5-part)
              </label>
              <input
                type="text"
                value={customExpr}
                onChange={e => setCustomExpr(e.target.value)}
                placeholder="e.g. 0 9 * * *"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
              <p className="text-[10px] text-slate-400 mt-1">Format: [minute] [hour] [day-of-month] [month] [day-of-week]</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingCron(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={!customExpr.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Execution Audit Logs Modal */}
      {logsModalOpen && (
        <Modal
          isOpen={logsModalOpen}
          onClose={() => setLogsModalOpen(false)}
          title={selectedJobLogs ? `Audit Logs: ${selectedJobLogs}` : 'System-Wide Automation Audit Logs'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Audit history of background executions recorded in Supabase PostgreSQL database.
              </p>
              <button
                onClick={() => loadLogs(selectedJobLogs)}
                disabled={loadingLogs}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <i className={`fas fa-rotate ${loadingLogs ? 'fa-spin' : ''}`}></i>
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Executed At</th>
                    <th className="px-4 py-2.5">Job Name</th>
                    <th className="px-4 py-2.5">Trigger</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Loading execution history from database...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                        <i className="fas fa-database text-slate-300 text-lg block mb-1"></i>
                        No execution logs recorded yet. Trigger a job using "Run Now" to test logging.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-slate-800">
                          {log.job_name}
                          {log.error_message && (
                            <span className="text-[10px] font-sans text-rose-500 block truncate max-w-xs">
                              {log.error_message}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.triggered_by === 'MANUAL_ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {log.triggered_by === 'MANUAL_ADMIN' ? 'Admin Run' : 'Schedule'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.duration_ms || 0}ms
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setLogsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
