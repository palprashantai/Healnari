import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AiButton } from '../../components/AiButton.jsx';

function AdminCMS() {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Edit Article State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // AI CMS Article Generator State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('Health Guide');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedArticle, setAiGeneratedArticle] = useState(null);

  const handleGenerateArticle = async () => {
    if (!aiTopic.trim()) {
      toast('Please enter an article topic or focus keyword.', 'error');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await apiFetch('/ai/cms-article', {
        method: 'POST',
        body: {
          topic: aiTopic.trim(),
          category: aiCategory,
        },
      });
      const data = res?.data || res;
      setAiGeneratedArticle(data);
      toast('AI article draft generated successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to generate article', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveGeneratedArticle = async () => {
    if (!aiGeneratedArticle) return;
    try {
      const payload = {
        title: aiGeneratedArticle.title,
        category: aiCategory,
        author: 'HealNari Clinical Team (AI Assisted)',
        status: 'Published',
        content: aiGeneratedArticle.content,
        summary: aiGeneratedArticle.summary,
      };
      const created = await apiFetch('/admin/cms', {
        method: 'POST',
        body: payload,
      });
      const newArticle = created || {
        ...payload,
        id: `temp-${Date.now()}`,
        views: 0,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setArticles(prev => [newArticle, ...prev]);
      setAiModalOpen(false);
      setAiGeneratedArticle(null);
      setAiTopic('');
      toast('Article saved to CMS library!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save article', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editingArticle.title?.trim()) {
      toast('Title is required', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const { id, title, category, summary, content, status, author } = editingArticle;
      await apiFetch(`/admin/cms/${id}`, {
        method: 'PUT',
        body: { title, category, summary, content, status, author }
      });
      setArticles(prev => prev.map(a => a.id === id ? { ...a, title, category, summary, content, status, author } : a));
      setEditModalOpen(false);
      toast('Article updated successfully', 'success');
    } catch (err) {
      toast('Failed to update article', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    apiFetch('/admin/cms')
      .then(d => setArticles(d || []))
      .catch(() => toast('Failed to load articles', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (article) => {
    const newStatus = article.status === 'Published' ? 'Draft' : 'Published';
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
    try {
      await apiFetch(`/admin/cms/${article.id}/status`, { method: 'PUT', body: { status: newStatus } });
      toast(`Article ${newStatus === 'Published' ? 'published' : 'unpublished'}.`, 'success');
    } catch {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: article.status } : a));
      toast('Failed to update article status', 'error');
    }
  };

  const handleDelete = async () => {
    const id = deleteTarget.id;
    setArticles(prev => prev.filter(a => a.id !== id));
    try {
      await apiFetch(`/admin/cms/${id}`, { method: 'DELETE' });
      toast('Article deleted.', 'info');
    } catch {
      toast('Failed to delete article', 'error');
    }
    setDeleteTarget(null);
  };

  const catIcon = (cat) => {
    if (cat === 'Symptom Checker') return 'fa-stethoscope';
    if (cat === 'Announcement') return 'fa-bullhorn';
    return 'fa-book-medical';
  };
  const catColor = (cat) => {
    if (cat === 'Symptom Checker') return 'bg-aubergine-100 text-aubergine-700';
    if (cat === 'Announcement') return 'bg-amber-100 text-amber-600';
    return 'bg-emerald-100 text-emerald-600';
  };

  const published = articles.filter(a => a.status === 'Published');
  const symCheckers = articles.filter(a => a.category === 'Symptom Checker');

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Content Management</h1>
          <p className="text-sm text-slate-500">Manage symptom checker logic, health guides, and platform announcements.</p>
        </div>
        <div className="flex gap-2.5">
          <AiButton
            variant="gradient"
            size="md"
            icon="fa-wand-magic-sparkles"
            badge="Gemini"
            onClick={() => { setAiModalOpen(true); setAiGeneratedArticle(null); }}
          >
            Generate Guide with AI
          </AiButton>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Published Articles', value: loading ? '…' : published.length },
          { label: 'Symptom Checkers', value: loading ? '…' : symCheckers.length },
          { label: 'Total Articles', value: loading ? '…' : articles.length },
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
          {loading && <i className="fas fa-spinner fa-spin text-slate-400"></i>}
        </div>
        <div className="divide-y divide-slate-50">
          {articles.map(a => (
            <div key={a.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors group">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${catColor(a.category)}`}>
                    <i className={`fas ${catIcon(a.category)}`}></i>
                  </span>
                  <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${a.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{a.status}</span>
                </div>
                <p className="text-xs text-slate-500 ml-8">By {a.author} • <span className="font-bold text-slate-600">{a.category}</span> • {a.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-2 hidden sm:block">
                  <p className="text-xs font-bold text-slate-800"><i className="fas fa-eye text-slate-400 mr-1"></i>{a.views || '0'}</p>
                  <p className="text-[10px] text-slate-400">Views</p>
                </div>
                <button onClick={() => toggleStatus(a)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" title={a.status === 'Published' ? 'Unpublish' : 'Publish'}>
                  <i className={`fas ${a.status === 'Published' ? 'fa-eye-slash' : 'fa-upload'} text-xs`}></i>
                </button>
                <button onClick={() => { setEditingArticle({ ...a }); setEditModalOpen(true); }} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Edit">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => setDeleteTarget(a)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          ))}
          {!loading && articles.length === 0 && (
            <div className="text-center py-14 text-slate-400">
              <i className="fas fa-newspaper text-3xl mb-2 block text-slate-300"></i>
              <p className="font-bold text-sm">No articles yet. Create your first one to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Article Generator Modal ── */}
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="AI Health Guide &amp; Article Generator" size="lg">
        <div className="space-y-4">
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <i className="fas fa-wand-magic-sparkles text-purple-600 text-sm mt-0.5 shrink-0"></i>
            <div>
              <p className="font-bold">Powered by Gemini 1.5 Medical Knowledge Base</p>
              <p className="text-purple-700 mt-0.5">Generates evidence-based, medically structured health guides complete with symptoms, nutritional guidance, and clinical disclaimers.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Article Topic or Focus *</label>
              <input 
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g. Managing Insulin Resistance in PCOS"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
              <select 
                value={aiCategory} 
                onChange={e => setAiCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="Health Guide">Health Guide</option>
                <option value="Symptom Checker">Symptom Guide</option>
                <option value="Announcement">Announcement</option>
              </select>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGenerateArticle}
            disabled={aiGenerating || !aiTopic.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i className={`fas ${aiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-sparkles'}`}></i>
            <span>{aiGenerating ? 'Generating Evidence-Based Draft...' : 'Generate Full Article Draft'}</span>
          </button>

          {aiGeneratedArticle && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Generated Draft Preview</span>
                <h3 className="font-bold text-slate-800 text-base">{aiGeneratedArticle.title}</h3>
                <p className="text-xs text-slate-600 italic">{aiGeneratedArticle.summary}</p>
                <div 
                  className="text-xs text-slate-700 max-h-56 overflow-y-auto border-t border-slate-200 pt-2 space-y-2 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: aiGeneratedArticle.content }}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setAiGeneratedArticle(null)} 
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Regenerate
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveGeneratedArticle}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check"></i>
                  <span>Publish to CMS Library</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Edit Article Modal ── */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Article" size="lg">
        {editingArticle && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Title</label>
                <input 
                  value={editingArticle.title}
                  onChange={e => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
                <select 
                  value={editingArticle.category} 
                  onChange={e => setEditingArticle({ ...editingArticle, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="Health Guide">Health Guide</option>
                  <option value="Symptom Checker">Symptom Checker</option>
                  <option value="Announcement">Announcement</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Summary</label>
              <textarea 
                value={editingArticle.summary || ''}
                onChange={e => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                rows="2"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Content (HTML)</label>
              <textarea 
                value={editingArticle.content || ''}
                onChange={e => setEditingArticle({ ...editingArticle, content: e.target.value })}
                rows="6"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setEditModalOpen(false)} 
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleEditSave}
                disabled={savingEdit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {savingEdit ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Article?" message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Forever" confirmStyle="danger" />
    </div>
  );
}

export default AdminCMS;
