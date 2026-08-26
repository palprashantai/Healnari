import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Exception form
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  
  const toast = useToast();

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const data = await apiFetch('/doctors/me/schedule');
      
      // Map existing schedule to all 7 days
      const formattedSchedule = DAYS_OF_WEEK.map(day => {
        const existing = data.schedule.find(s => s.day_of_week === day.id);
        return {
          dayOfWeek: day.id,
          name: day.name,
          isActive: !!existing,
          startTime: existing ? existing.start_time : '09:00:00',
          endTime: existing ? existing.end_time : '17:00:00'
        };
      });
      
      setSchedule(formattedSchedule);
      setExceptions(data.exceptions || []);
    } catch (error) {
      toast('Failed to load schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (dayId, field, value) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayId ? { ...day, [field]: value } : day
    ));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const payload = {
        schedule: schedule.filter(d => d.isActive).map(d => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime
        }))
      };
      
      await apiFetch('/doctors/me/schedule', {
        method: 'PUT',
        body: payload
      });
      
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
    
    try {
      const data = await apiFetch('/doctors/me/exceptions', {
        method: 'POST',
        body: {
          exceptionDate,
          isAvailable: false,
          reason: exceptionReason
        }
      });
      
      setExceptions(prev => [...prev, data].sort((a, b) => new Date(a.exception_date) - new Date(b.exception_date)));
      setExceptionDate('');
      setExceptionReason('');
      toast('Time off added successfully', 'success');
    } catch (error) {
      toast('Failed to add time off', 'error');
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
          <div className="w-8 h-8 border-4 border-aubergine-200 border-t-aubergine-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 font-medium text-sm">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Schedule</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your weekly working hours and time off.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Schedule */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-calendar-week text-aubergine-600"></i> Weekly Availability
              </h2>
            </div>
            
            <div className="divide-y divide-slate-100 flex-1">
              {schedule.map(day => (
                <div key={day.dayOfWeek} className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${day.isActive ? 'bg-white' : 'bg-slate-50/50'}`}>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleScheduleChange(day.dayOfWeek, 'isActive', !day.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${day.isActive ? 'bg-aubergine-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${day.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`font-bold w-24 ${day.isActive ? 'text-slate-800' : 'text-slate-400'}`}>{day.name}</span>
                  </div>

                  {day.isActive ? (
                    <div className="flex items-center gap-2 sm:gap-4 ml-14 sm:ml-0">
                      <input 
                        type="time" 
                        value={day.startTime}
                        onChange={(e) => handleScheduleChange(day.dayOfWeek, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-slate-50"
                      />
                      <span className="text-slate-400 text-xs font-bold">to</span>
                      <input 
                        type="time" 
                        value={day.endTime}
                        onChange={(e) => handleScheduleChange(day.dayOfWeek, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-slate-50"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 font-medium italic ml-14 sm:ml-0">Not working</div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={handleSaveSchedule}
                disabled={saving}
                className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-aubergine-500/20 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {saving ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Saving...</>
                ) : (
                  <><i className="fas fa-save"></i> Save Schedule</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Time Off (Exceptions) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-plane-departure text-rose-500"></i> Time Off
              </h2>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleAddException} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reason (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Vacation, Conference"
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!exceptionDate}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  Add Time Off
                </button>
              </form>
            </div>

            <div className="border-t border-slate-100">
              <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Upcoming Time Off
              </div>
              <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                {exceptions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No upcoming time off scheduled.
                  </div>
                ) : (
                  exceptions.map(exc => (
                    <div key={exc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{new Date(exc.exception_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        {exc.reason && <p className="text-xs text-slate-500 mt-0.5">{exc.reason}</p>}
                      </div>
                      <button 
                        onClick={() => handleRemoveException(exc.id)}
                        className="text-slate-300 hover:text-rose-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors"
                        title="Remove time off"
                      >
                        <i className="fas fa-trash-can text-sm"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
