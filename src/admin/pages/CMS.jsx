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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Edit / Create Article Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editModalTab, setEditModalTab] = useState('edit'); // 'edit' | 'preview'
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
      const slugCandidate = aiGeneratedArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        title: aiGeneratedArticle.title,
        category: aiCategory,
        author: 'HealNari Clinical Team (AI Assisted)',
        status: 'Published',
        content: aiGeneratedArticle.content,
        summary: aiGeneratedArticle.summary,
        slug: slugCandidate,
        readTime: '5 min read',
        tags: [aiCategory, 'Evidence-Based', 'Hormonal Health'],
      };
      const created = await apiFetch('/admin/cms', {
        method: 'POST',
        body: payload,
      });
      const newArticle = created || {
        ...payload,
        id: `cms-${Date.now()}`,
        views: 0,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setArticles(prev => [newArticle, ...prev]);
      setAiModalOpen(false);
      setAiGeneratedArticle(null);
      setAiTopic('');
      toast('Article published to CMS library!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save article', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingArticle({
      id: 'new',
      title: '',
      slug: '',
      category: 'Health Guide',
      author: 'HealNari Clinical Team',
      status: 'Draft',
      summary: '',
      content: '',
      read_time: '4 min read',
      tags: "Women's Health, Hormonal Balance",
      seo_title: '',
      meta_description: '',
      canonical_url: '',
      robots: 'INDEX, FOLLOW',
      primary_keyword: '',
      search_intent: 'Informational',
      featured_image: '',
      medical_reviewer: '',
      medical_reviewer_credentials: '',
      topic_cluster: '',
    });
    setEditModalTab('edit');
    setEditModalOpen(true);
  };

  const openEditModal = (art) => {
    const rawTags = art.tags;
    const formattedTags = Array.isArray(rawTags) ? rawTags.join(', ') : (rawTags || '');
    setEditingArticle({
      ...art,
      read_time: art.read_time || art.readTime || '4 min read',
      tags: formattedTags,
      robots: art.robots || 'INDEX, FOLLOW',
      search_intent: art.search_intent || 'Informational',
    });
    setEditModalTab('edit');
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingArticle.title?.trim()) {
      toast('Article title is required', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const { id, title, category, summary, content, status, author, slug, tags, read_time,
        seo_title, meta_description, canonical_url, robots, primary_keyword, search_intent,
        featured_image, medical_reviewer, medical_reviewer_credentials, topic_cluster } = editingArticle;
      
      const computedSlug = slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const parsedTags = typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(tags) ? tags : []);
      const cleanReadTime = read_time?.trim() || '4 min read';

      const basePayload = {
        title,
        category,
        summary,
        content,
        status: status || 'Draft',
        author: author || 'HealNari Clinical Team',
        slug: computedSlug,
        tags: parsedTags,
        readTime: cleanReadTime,
        read_time: cleanReadTime,
        seo_title,
        meta_description,
        canonical_url,
        robots,
        primary_keyword,
        search_intent,
        featured_image,
        medical_reviewer,
        medical_reviewer_credentials,
        topic_cluster,
      };

      if (id === 'new') {
        const created = await apiFetch('/admin/cms', {
          method: 'POST',
          body: basePayload,
        });
        const newArt = created || {
          ...basePayload,
          id: `art-${Date.now()}`,
          views: 0,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
        setArticles(prev => [newArt, ...prev]);
        toast('New article created successfully!', 'success');
      } else {
        await apiFetch(`/admin/cms/${id}`, {
          method: 'PUT',
          body: basePayload,
        });
        setArticles(prev => prev.map(a => a.id === id ? { ...a, ...basePayload } : a));
        toast('Article updated successfully', 'success');
      }
      setEditModalOpen(false);
    } catch (err) {
      toast(err.message || 'Failed to update article', 'error');
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
      toast(`Article ${newStatus === 'Published' ? 'published' : 'moved to draft'}.`, 'success');
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
    if (cat === 'Announcement') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-750';
  };

  // Filtered articles
  const filteredArticles = articles.filter(a => {
    const matchesSearch = searchQuery.trim() === '' || 
      (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.summary && a.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.author && a.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.slug && a.slug.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || a.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const published = articles.filter(a => a.status === 'Published');
  const symCheckers = articles.filter(a => a.category === 'Symptom Checker');

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Content Management System</h1>
          <p className="text-sm text-slate-500 mt-0.5">Author, publish, and manage evidence-based clinical guides and public health content.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>New Article</span>
          </button>
          <AiButton
            variant="gradient"
            size="md"
            icon="fa-wand-magic-sparkles"
            badge="Gemini AI"
            onClick={() => { setAiModalOpen(true); setAiGeneratedArticle(null); }}
          >
            Draft with AI
          </AiButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Published Articles', value: loading ? '…' : published.length, icon: 'fa-globe', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Symptom Guides', value: loading ? '…' : symCheckers.length, icon: 'fa-stethoscope', color: 'text-purple-600 bg-purple-50 border-purple-100' },
          { label: 'Total Content Library', value: loading ? '…' : articles.length, icon: 'fa-book-medical', color: 'text-brand-600 bg-brand-50 border-brand-100' },
        ].map(s => (
          <Tilt3D key={s.label} max={4}>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900 font-display">{s.value}</div>
                <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg border ${s.color}`}>
                <i className={`fas ${s.icon}`}></i>
              </div>
            </div>
          </Tilt3D>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, summary, slug, or author..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
              {['All', 'Health Guide', 'Symptom Checker', 'Announcement'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedCategory === cat 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'All' ? 'All Types' : cat}
                </button>
              ))}
            </div>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Article Rows */}
        <div className="divide-y divide-slate-100">
          {filteredArticles.map(a => {
            const articleSlug = a.slug || a.id;
            return (
              <div key={a.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${catColor(a.category)}`}>
                      <i className={`fas ${catIcon(a.category)}`}></i>
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base hover:text-brand-600 transition-colors cursor-pointer" onClick={() => openEditModal(a)}>
                      {a.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      a.status === 'Published' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {a.status}
                    </span>
                    {a.read_time && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        <i className="fas fa-clock mr-1 text-[9px]"></i>{a.read_time}
                      </span>
                    )}
                  </div>

                  {a.summary && (
                    <p className="text-xs text-slate-500 line-clamp-1 mb-1.5 pl-8 font-medium">
                      {a.summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pl-8">
                    <span>By <strong className="text-slate-600">{a.author || 'HealNari Clinical Team'}</strong></span>
                    <span>•</span>
                    <span>Slug: <code className="text-brand-600 font-mono text-[10px] bg-brand-50 px-1.5 py-0.5 rounded">/guide/{articleSlug}</code></span>
                    {a.date && (
                      <>
                        <span>•</span>
                        <span>{a.date}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-center">
                  <div className="text-right mr-2 hidden md:block">
                    <p className="text-xs font-extrabold text-slate-700">
                      <i className="fas fa-eye text-slate-400 mr-1 text-[10px]"></i>{a.views || '0'}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Views</p>
                  </div>

                  {/* View Public Page */}
                  <a
                    href={`/guide/${articleSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 flex items-center justify-center transition-colors"
                    title="View Public Guide"
                  >
                    <i className="fas fa-external-link-alt text-xs"></i>
                  </a>

                  {/* Toggle Publish / Draft */}
                  <button 
                    onClick={() => toggleStatus(a)} 
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      a.status === 'Published' 
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title={a.status === 'Published' ? 'Unpublish to Draft' : 'Publish Live'}
                  >
                    <i className={`fas ${a.status === 'Published' ? 'fa-eye-slash' : 'fa-upload'} text-xs`}></i>
                  </button>

                  {/* Edit */}
                  <button 
                    onClick={() => openEditModal(a)} 
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" 
                    title="Edit Guide"
                  >
                    <i className="fas fa-pen text-xs"></i>
                  </button>

                  {/* Delete */}
                  <button 
                    onClick={() => setDeleteTarget(a)} 
                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors" 
                    title="Delete"
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filteredArticles.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-newspaper text-3xl mb-3 block text-slate-300"></i>
              <p className="font-bold text-sm text-slate-600">No articles match your criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try changing your search query or reset category filters.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-spinner fa-spin text-2xl mb-2 text-brand-600"></i>
              <p className="text-xs font-semibold">Loading CMS content library...</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit / Create Article Modal ── */}
      <Modal 
        isOpen={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        title={editingArticle?.id === 'new' ? 'Create New Health Article' : 'Edit Article & Clinical Guide'} 
        size="lg"
      >
        {editingArticle && (
          <div className="space-y-4">
            {/* Modal Tabs: Edit vs Live Preview */}
            <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setEditModalTab('edit')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  editModalTab === 'edit'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-pen-to-square mr-1.5"></i> Content
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('seo')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  editModalTab === 'seo'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-search mr-1.5"></i> SEO
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('medical')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  editModalTab === 'medical'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-stethoscope mr-1.5"></i> Medical
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('publishing')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  editModalTab === 'publishing'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-upload mr-1.5"></i> Publishing
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('preview')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  editModalTab === 'preview'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-eye mr-1.5"></i> Preview
              </button>
            </div>

            {editModalTab === 'edit' ? (
              <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Article Title *</label>
                    <input 
                      value={editingArticle.title || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, title: e.target.value })}
                      placeholder="e.g. Managing PCOS Insulin Resistance with Nutrition"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
                    <select 
                      value={editingArticle.category || 'Health Guide'} 
                      onChange={e => setEditingArticle({ ...editingArticle, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="Health Guide">Health Guide</option>
                      <option value="Symptom Checker">Symptom Checker</option>
                      <option value="Announcement">Announcement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">URL Slug</label>
                    <input 
                      value={editingArticle.slug || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, slug: e.target.value })}
                      placeholder="e.g. pcos-insulin-resistance-guide"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Author / Clinician</label>
                    <input 
                      value={editingArticle.author || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, author: e.target.value })}
                      placeholder="e.g. Dr. Sarah Mitchell"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Read Time</label>
                    <input 
                      value={editingArticle.read_time || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, read_time: e.target.value })}
                      placeholder="e.g. 5 min read"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tags (comma-separated)</label>
                  <input 
                    value={editingArticle.tags || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, tags: e.target.value })}
                    placeholder="PCOS, Endocrinology, Diet & Lifestyle, Insulin Resistance"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Executive Summary</label>
                  <textarea 
                    value={editingArticle.summary || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                    rows="2"
                    placeholder="Brief 1-2 sentence medical summary shown on cards and in search results..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Full Article Content (HTML / Structured Paragraphs)</span>
                    <span className="text-[11px] font-normal text-slate-400 font-mono">&lt;h2&gt;, &lt;p&gt;, &lt;ul&gt; supported</span>
                  </label>
                  <textarea 
                    value={editingArticle.content || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, content: e.target.value })}
                    rows="8"
                    placeholder="<h2>Understanding the Root Causes</h2><p>Insulin resistance plays a central role...</p>"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
                  />
                </div>
              </div>
            ) : editModalTab === 'seo' ? (
              <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-800 text-xs font-medium flex gap-2">
                  <i className="fas fa-info-circle mt-0.5"></i>
                  <p>These fields control how the article appears on Google Search and social media. Leave blank to auto-generate from Content.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 flex justify-between">
                    <span>SEO Title</span>
                    <span className={editingArticle.seo_title?.length > 60 ? 'text-amber-500' : 'text-slate-400'}>{editingArticle.seo_title?.length || 0}/60</span>
                  </label>
                  <input 
                    value={editingArticle.seo_title || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, seo_title: e.target.value })}
                    placeholder={editingArticle.title || 'e.g. Managing PCOS Insulin Resistance | HealNari'}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 flex justify-between">
                    <span>Meta Description</span>
                    <span className={editingArticle.meta_description?.length > 160 ? 'text-amber-500' : 'text-slate-400'}>{editingArticle.meta_description?.length || 0}/160</span>
                  </label>
                  <textarea 
                    value={editingArticle.meta_description || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, meta_description: e.target.value })}
                    rows="2"
                    placeholder={editingArticle.summary || 'A concise description for search engines...'}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Primary Keyword</label>
                    <input 
                      value={editingArticle.primary_keyword || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, primary_keyword: e.target.value })}
                      placeholder="e.g. high testosterone in women"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Search Intent</label>
                    <select 
                      value={editingArticle.search_intent || 'Informational'} 
                      onChange={e => setEditingArticle({ ...editingArticle, search_intent: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="Informational">Informational (Learn)</option>
                      <option value="Navigational">Navigational (Find)</option>
                      <option value="Commercial">Commercial (Compare)</option>
                      <option value="Transactional">Transactional (Book)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Canonical URL</label>
                    <input 
                      value={editingArticle.canonical_url || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, canonical_url: e.target.value })}
                      placeholder="Leave blank for self-referencing"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Robots</label>
                    <select 
                      value={editingArticle.robots || 'INDEX, FOLLOW'} 
                      onChange={e => setEditingArticle({ ...editingArticle, robots: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="INDEX, FOLLOW">Index, Follow (Public)</option>
                      <option value="NOINDEX, FOLLOW">Noindex, Follow</option>
                      <option value="NOINDEX, NOFOLLOW">Noindex, Nofollow (Hidden)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : editModalTab === 'medical' ? (
              <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-medium flex gap-2">
                  <i className="fas fa-user-md mt-0.5"></i>
                  <p>YMYL (Your Money Your Life) Content: Ensure medical claims are cited and reviewed by verified clinical staff to maintain E-E-A-T.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Medical Reviewer</label>
                    <input 
                      value={editingArticle.medical_reviewer || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, medical_reviewer: e.target.value })}
                      placeholder="e.g. Dr. John Smith"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Reviewer Credentials</label>
                    <input 
                      value={editingArticle.medical_reviewer_credentials || ''}
                      onChange={e => setEditingArticle({ ...editingArticle, medical_reviewer_credentials: e.target.value })}
                      placeholder="e.g. MD, Endocrinology"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Topic Cluster (Internal Silo)</label>
                  <select 
                    value={editingArticle.topic_cluster || ''} 
                    onChange={e => setEditingArticle({ ...editingArticle, topic_cluster: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">Select a Cluster</option>
                    <option value="Hormonal Health">Hormonal Health</option>
                    <option value="Women's Health">Women's Health</option>
                    <option value="PCOS">PCOS</option>
                    <option value="Hair Loss">Hair Loss</option>
                    <option value="Thyroid">Thyroid</option>
                  </select>
                </div>
              </div>
            ) : editModalTab === 'publishing' ? (
              <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-2 block">Lifecycle Status</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Draft', 'In Review', 'Medical Review', 'Approved', 'Scheduled', 'Published', 'Archived'].map(st => (
                      <label key={st} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editingArticle.status === st ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                          type="radio" 
                          name="article_status" 
                          value={st} 
                          checked={editingArticle.status === st} 
                          onChange={() => setEditingArticle({ ...editingArticle, status: st })} 
                          className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-bold text-slate-700">{st}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {editingArticle.status === 'Scheduled' && (
                  <div className="p-4 border border-brand-200 bg-brand-50 rounded-xl">
                     <label className="text-xs font-bold text-brand-800 mb-1 block">Scheduled Date & Time (UTC)</label>
                     <input 
                       type="datetime-local"
                       value={editingArticle.scheduled_at ? editingArticle.scheduled_at.slice(0, 16) : ''}
                       onChange={e => setEditingArticle({...editingArticle, scheduled_at: new Date(e.target.value).toISOString()})}
                       className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                     />
                  </div>
                )}
                
                {editingArticle.status === 'Published' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <i className="fas fa-check-circle"></i>
                      Ready to Publish
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-emerald-700 list-disc list-inside">
                      <li>Sitemap will be updated</li>
                      <li>URL: <code>/learn/{editingArticle.slug || 'slug'}</code></li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-[68vh] overflow-y-auto space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-800 px-2.5 py-0.5 rounded-full">
                    {editingArticle.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    <i className="fas fa-clock mr-1"></i>{editingArticle.read_time || '4 min read'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    • By {editingArticle.author || 'Clinical Specialist'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                  {editingArticle.title || 'Untitled Article'}
                </h1>

                {editingArticle.summary && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 italic border-l-4 border-l-brand-600">
                    <strong>Summary:</strong> {editingArticle.summary}
                  </div>
                )}

                <div 
                  className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-sm border-t border-slate-200 pt-3"
                  dangerouslySetInnerHTML={{ __html: editingArticle.content || '<p className="text-slate-400 italic">No content written yet.</p>' }}
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setEditModalOpen(false)} 
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleEditSave}
                disabled={savingEdit}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {savingEdit ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                <span>{editingArticle.id === 'new' ? 'Create Article' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── AI Article Generator Modal ── */}
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="AI Health Guide &amp; Article Generator" size="lg">
        <div className="space-y-4">
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <i className="fas fa-wand-magic-sparkles text-purple-600 text-sm mt-0.5 shrink-0"></i>
            <div>
              <p className="font-bold">Powered by Gemini Medical Knowledge Base</p>
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
            <i className={`fas ${aiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
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

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete}
        title="Delete Article?" 
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will remove it from the patient health guides.`}
        confirmLabel="Delete Forever" 
        confirmStyle="danger" 
      />
    </div>
  );
}

export default AdminCMS;
