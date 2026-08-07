import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const INITIAL_ARTICLES = [
  { id: 'C-101', title: 'PCOS Diagnostic Algorithm v2', author: 'Medical Board', category: 'Symptom Checker', status: 'Published', views: '12K', date: '10 Jun 2026' },
  { id: 'C-102', title: 'Endometriosis Patient Guide', author: 'Dr. Sarah Mitchell', category: 'Health Guide', status: 'Draft', views: '-', date: '18 Jun 2026' },
  { id: 'C-103', title: 'Platform Maintenance Notice',  author: 'System Admin', category: 'Announcement', status: 'Published', views: '8.4K', date: '05 May 2026' },
];

/* ─── Main Component ─────────────────────────── */
function AdminCMS() {
  const toast = useToast();
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const toggleStatus = (id) => {
    setArticles(prev => prev.map(a => {
      if (a.id === id) {
        const newStatus = a.status === 'Published' ? 'Draft' : 'Published';
        toast(`Article moved to ${newStatus}.`, 'info');
        return { ...a, status: newStatus };
      }
      return a;
    }));
  };

  const handleDelete = () => {
    setArticles(prev => prev.filter(a => a.id !== deleteTarget.id));
    toast('Article deleted forever.', 'info');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Content Management</h1>
          <p className="text-sm text-slate-500">Manage symptom checker logic, health guides, and platform announcements.</p>
        </div>
        <button onClick={() => toast('Opening content editor...', 'info')}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-plus"></i> Create Content
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Health Guides', value: articles.filter(a => a.category === 'Health Guide' && a.status === 'Published').length },
          { label: 'Symptom Checkers', value: articles.filter(a => a.category === 'Symptom Checker').length },
          { label: 'Total Page Views', value: '20.4K' },
        ].map(s => (
          <Tilt3D key={s.label} max={5}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl font-black text-slate-800">{s.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
          </Tilt3D>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Article Library</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {articles.map(a => (
            <div key={a.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors group">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${a.category === 'Symptom Checker' ? 'bg-sky-100 text-sky-600' : a.category === 'Announcement' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <i className={`fas ${a.category === 'Symptom Checker' ? 'fa-stethoscope' : a.category === 'Announcement' ? 'fa-bullhorn' : 'fa-book-medical'}`}></i>
                  </span>
                  <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${a.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{a.status}</span>
                </div>
                <p className="text-xs text-slate-500 ml-8">By {a.author} • <span className="font-bold text-slate-600">{a.category}</span> • {a.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-2 hidden sm:block">
                  <p className="text-xs font-bold text-slate-800"><i className="fas fa-eye text-slate-400 mr-1"></i>{a.views}</p>
                  <p className="text-[10px] text-slate-400">Views</p>
                </div>
                <button onClick={() => toggleStatus(a.id)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" title={a.status === 'Published' ? 'Unpublish' : 'Publish'}>
                  <i className={`fas ${a.status === 'Published' ? 'fa-eye-slash' : 'fa-upload'} text-xs`}></i>
                </button>
                <button onClick={() => toast('Opening editor...', 'info')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Edit">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => setDeleteTarget(a)} aria-label="Delete article" className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" title="Delete">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <div className="text-center py-14 text-slate-400">
              <i className="fas fa-newspaper text-3xl mb-2 block text-slate-300"></i>
              <p className="font-bold text-sm">No articles yet. Create your first one to get started.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Article?" message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Forever" confirmStyle="danger" />
    </div>
  );
}

export default AdminCMS;
