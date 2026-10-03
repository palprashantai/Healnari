import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import {
  getClinicalConditions,
  saveClinicalConditions,
  DEFAULT_CLINICAL_CONDITIONS
} from '../../data/symptomAssessmentData.js';

export function ClinicalContentManager() {
  const toast = useToast();
  const [conditions, setConditions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Edit / Create Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [modalTab, setModalTab] = useState('clinical'); // 'clinical' | 'education' | 'preview'

  // Load conditions on mount
  useEffect(() => {
    const list = getClinicalConditions();
    setConditions(list);
  }, []);

  // Filter conditions
  const filteredConditions = useMemo(() => {
    return conditions.filter(c => {
      const matchesSearch = !searchQuery.trim() || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.symptoms || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || c.reviewStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [conditions, searchQuery, selectedCategory, selectedStatus]);

  // Categories list
  const uniqueCategories = useMemo(() => {
    const set = new Set(conditions.map(c => c.category));
    return Array.from(set);
  }, [conditions]);

  const openCreateModal = () => {
    setEditingCondition({
      id: `cond_${Date.now()}`,
      name: '',
      category: 'PCOS / Ovulatory Health',
      description: '',
      symptoms: '',
      relatedSymptoms: '',
      possibleCauses: '',
      specialist: {
        primary: 'Gynaecologist',
        secondary: ['Endocrinologist']
      },
      redFlags: '',
      patientEducation: {
        whatIsIt: '',
        whatSymptomsCanBeAssociated: '',
        whyMightItRelateToMySymptoms: '',
        howIsItUsuallyEvaluated: '',
        whatSpecialistEvaluatesIt: '',
        whatTreatmentApproachesExist: '',
        whenShouldISeekMedicalAttention: ''
      },
      disclaimer: 'This information is educational and does not constitute a medical diagnosis. Only a qualified clinician can evaluate your symptoms.',
      reviewStatus: 'Draft',
      medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology)',
      lastReviewedDate: new Date().toISOString().split('T')[0],
      sources: '',
      publishedStatus: false
    });
    setModalTab('clinical');
    setEditModalOpen(true);
  };

  const openEditModal = (cond) => {
    setEditingCondition({
      ...cond,
      symptoms: Array.isArray(cond.symptoms) ? cond.symptoms.join(', ') : (cond.symptoms || ''),
      relatedSymptoms: Array.isArray(cond.relatedSymptoms) ? cond.relatedSymptoms.join(', ') : (cond.relatedSymptoms || ''),
      possibleCauses: Array.isArray(cond.possibleCauses) ? cond.possibleCauses.join('\n') : (cond.possibleCauses || ''),
      redFlags: Array.isArray(cond.redFlags) ? cond.redFlags.join('\n') : (cond.redFlags || ''),
      sources: Array.isArray(cond.sources) ? cond.sources.join('\n') : (cond.sources || ''),
      patientEducation: {
        whatIsIt: cond.patientEducation?.whatIsIt || '',
        whatSymptomsCanBeAssociated: cond.patientEducation?.whatSymptomsCanBeAssociated || '',
        whyMightItRelateToMySymptoms: cond.patientEducation?.whyMightItRelateToMySymptoms || '',
        howIsItUsuallyEvaluated: cond.patientEducation?.howIsItUsuallyEvaluated || '',
        whatSpecialistEvaluatesIt: cond.patientEducation?.whatSpecialistEvaluatesIt || '',
        whatTreatmentApproachesExist: cond.patientEducation?.whatTreatmentApproachesExist || '',
        whenShouldISeekMedicalAttention: cond.patientEducation?.whenShouldISeekMedicalAttention || ''
      },
      secondarySpecialists: Array.isArray(cond.specialist?.secondary) ? cond.specialist.secondary.join(', ') : ''
    });
    setModalTab('clinical');
    setEditModalOpen(true);
  };

  const handleSaveCondition = () => {
    if (!editingCondition.name?.trim()) {
      toast('Condition name is required.', 'error');
      return;
    }

    const parsedSymptoms = typeof editingCondition.symptoms === 'string'
      ? editingCondition.symptoms.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean)
      : (editingCondition.symptoms || []);

    const parsedRelated = typeof editingCondition.relatedSymptoms === 'string'
      ? editingCondition.relatedSymptoms.split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean)
      : (editingCondition.relatedSymptoms || []);

    const parsedCauses = typeof editingCondition.possibleCauses === 'string'
      ? editingCondition.possibleCauses.split('\n').map(s => s.trim()).filter(Boolean)
      : (editingCondition.possibleCauses || []);

    const parsedRedFlags = typeof editingCondition.redFlags === 'string'
      ? editingCondition.redFlags.split('\n').map(s => s.trim()).filter(Boolean)
      : (editingCondition.redFlags || []);

    const parsedSources = typeof editingCondition.sources === 'string'
      ? editingCondition.sources.split('\n').map(s => s.trim()).filter(Boolean)
      : (editingCondition.sources || []);

    const parsedSecondary = typeof editingCondition.secondarySpecialists === 'string'
      ? editingCondition.secondarySpecialists.split(',').map(s => s.trim()).filter(Boolean)
      : (editingCondition.specialist?.secondary || []);

    const updatedCondition = {
      ...editingCondition,
      symptoms: parsedSymptoms,
      relatedSymptoms: parsedRelated,
      possibleCauses: parsedCauses,
      redFlags: parsedRedFlags,
      sources: parsedSources,
      specialist: {
        primary: editingCondition.specialist?.primary || 'Gynaecologist',
        secondary: parsedSecondary
      },
      publishedStatus: editingCondition.reviewStatus === 'Published'
    };

    const exists = conditions.some(c => c.id === updatedCondition.id);
    let newConditions;
    if (exists) {
      newConditions = conditions.map(c => c.id === updatedCondition.id ? updatedCondition : c);
    } else {
      newConditions = [updatedCondition, ...conditions];
    }

    setConditions(newConditions);
    saveClinicalConditions(newConditions);
    setEditModalOpen(false);
    toast(`Condition "${updatedCondition.name}" saved successfully!`, 'success');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset clinical conditions to initial medical default registry?')) {
      saveClinicalConditions(DEFAULT_CLINICAL_CONDITIONS);
      setConditions(DEFAULT_CLINICAL_CONDITIONS);
      toast('Reset to default clinical conditions successfully.', 'success');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-aubergine-100 text-aubergine-900 border border-aubergine-200 mb-1.5">
            <i className="fas fa-stethoscope text-[10px]" />
            Clinical Protocol &amp; Care Navigation Registry
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
            Clinical Conditions &amp; Protocols
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage educational conditions, non-diagnostic patient education, medical review lifecycle, and specialist mappings for the symptom assessment engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl transition-all shadow-2xs"
          >
            <i className="fas fa-rotate-left mr-1.5 text-slate-400" />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus text-xs" />
            <span>Add Condition</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Published Conditions', value: conditions.filter(c => c.reviewStatus === 'Published').length, icon: 'fa-circle-check', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Clinical Review Stage', value: conditions.filter(c => c.reviewStatus === 'Clinical Review').length, icon: 'fa-user-doctor', color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Draft Conditions', value: conditions.filter(c => c.reviewStatus === 'Draft').length, icon: 'fa-file-lines', color: 'text-slate-600 bg-slate-50 border-slate-200' },
          { label: 'Total Registry Entries', value: conditions.length, icon: 'fa-book-medical', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
        ].map(kpi => (
          <Tilt3D key={kpi.label} max={4}>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-slate-900 font-display">{kpi.value}</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{kpi.label}</div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm border ${kpi.color}`}>
                <i className={`fas ${kpi.icon}`} />
              </div>
            </div>
          </Tilt3D>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-grow max-w-md">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conditions, categories, or symptoms..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-aubergine-500 shadow-2xs"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-aubergine-500 shadow-2xs"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Clinical Review">Clinical Review</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published</option>
          </select>
        </div>
      </div>

      {/* Conditions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Condition &amp; Category</th>
                <th className="py-3 px-4">Review Lifecycle Status</th>
                <th className="py-3 px-4">Primary Specialist</th>
                <th className="py-3 px-4">Medical Reviewer</th>
                <th className="py-3 px-4">Last Reviewed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConditions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No clinical conditions matched your filters.
                  </td>
                </tr>
              ) : (
                filteredConditions.map(cond => {
                  const statusColors = {
                    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
                    'Clinical Review': 'bg-amber-50 text-amber-800 border-amber-200',
                    Approved: 'bg-blue-50 text-blue-800 border-blue-200',
                    Published: 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  };

                  return (
                    <tr key={cond.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 font-extrabold text-sm block">
                          {cond.name}
                        </strong>
                        <span className="text-[11px] text-aubergine-700 font-medium">
                          {cond.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusColors[cond.reviewStatus] || 'bg-slate-100'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{cond.reviewStatus}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {cond.specialist?.primary || 'Gynaecologist'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-xs">
                        {cond.medicalReviewer || 'HealNari Clinical Board'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {cond.lastReviewedDate || '2026-09-15'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(cond)}
                          className="bg-slate-100 hover:bg-aubergine-50 text-slate-700 hover:text-aubergine-700 font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                        >
                          <i className="fas fa-pen-to-square mr-1" />
                          Edit Protocol
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Condition Modal */}
      {editModalOpen && editingCondition && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Clinical Protocol: ${editingCondition.name || 'New Condition'}`}
          size="2xl"
        >
          <div className="space-y-5 text-left">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setModalTab('clinical')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  modalTab === 'clinical'
                    ? 'border-aubergine-600 text-aubergine-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Clinical Metadata &amp; Review
              </button>
              <button
                type="button"
                onClick={() => setModalTab('education')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  modalTab === 'education'
                    ? 'border-aubergine-600 text-aubergine-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Patient Education Questions
              </button>
              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  modalTab === 'preview'
                    ? 'border-aubergine-600 text-aubergine-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Patient Card Preview
              </button>
            </div>

            {/* TAB 1: Clinical Metadata & Review */}
            {modalTab === 'clinical' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Condition Title *
                    </label>
                    <input
                      type="text"
                      value={editingCondition.name}
                      onChange={(e) => setEditingCondition({ ...editingCondition, name: e.target.value })}
                      placeholder="e.g. Polycystic Ovary Syndrome (PCOS)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={editingCondition.category}
                      onChange={(e) => setEditingCondition({ ...editingCondition, category: e.target.value })}
                      placeholder="e.g. PCOS / Ovulatory Health"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Short Medical Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.description}
                    onChange={(e) => setEditingCondition({ ...editingCondition, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-aubergine-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Review Status (Lifecycle)
                    </label>
                    <select
                      value={editingCondition.reviewStatus}
                      onChange={(e) => setEditingCondition({ ...editingCondition, reviewStatus: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-aubergine-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Clinical Review">Clinical Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Primary Specialist
                    </label>
                    <input
                      type="text"
                      value={editingCondition.specialist?.primary || 'Gynaecologist'}
                      onChange={(e) => setEditingCondition({
                        ...editingCondition,
                        specialist: { ...editingCondition.specialist, primary: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Medical Reviewer &amp; Credentials
                    </label>
                    <input
                      type="text"
                      value={editingCondition.medicalReviewer || ''}
                      onChange={(e) => setEditingCondition({ ...editingCondition, medicalReviewer: e.target.value })}
                      placeholder="e.g. Dr. Ananya Mehta, MD (OB/GYN)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Last Reviewed Date
                    </label>
                    <input
                      type="date"
                      value={editingCondition.lastReviewedDate || ''}
                      onChange={(e) => setEditingCondition({ ...editingCondition, lastReviewedDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Associated Symptom IDs (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingCondition.symptoms}
                    onChange={(e) => setEditingCondition({ ...editingCondition, symptoms: e.target.value })}
                    placeholder="irregular_periods, acne, hair_fall, facial_body_hair"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-aubergine-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Red Flags / Urgent Warning Signs (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.redFlags}
                    onChange={(e) => setEditingCondition({ ...editingCondition, redFlags: e.target.value })}
                    placeholder="Sudden excruciating lower abdominal pain&#10;Heavy uncontrolled bleeding"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-aubergine-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Clinical Guidelines &amp; Sources (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.sources}
                    onChange={(e) => setEditingCondition({ ...editingCondition, sources: e.target.value })}
                    placeholder="ACOG Practice Bulletin No. 194&#10;International PCOS Guideline (Monash/ASRM 2023)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-aubergine-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Patient Education Questions */}
            {modalTab === 'education' && (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    1. What is it?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.whatIsIt}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, whatIsIt: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    2. What symptoms can be associated with it?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.whatSymptomsCanBeAssociated}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, whatSymptomsCanBeAssociated: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    3. Why might it relate to my symptoms?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.whyMightItRelateToMySymptoms}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, whyMightItRelateToMySymptoms: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    4. How is it usually evaluated?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.howIsItUsuallyEvaluated}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, howIsItUsuallyEvaluated: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    5. What treatment approaches may exist?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.whatTreatmentApproachesExist}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, whatTreatmentApproachesExist: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    6. When should I seek medical attention?
                  </label>
                  <textarea
                    rows={2}
                    value={editingCondition.patientEducation.whenShouldISeekMedicalAttention}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      patientEducation: { ...editingCondition.patientEducation, whenShouldISeekMedicalAttention: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Preview */}
            {modalTab === 'preview' && (
              <div className="bg-sand-50/70 p-5 rounded-2xl border border-sand-200 space-y-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-aubergine-100 text-aubergine-900 uppercase">
                  {editingCondition.category}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {editingCondition.name}
                </h3>
                <p className="text-xs text-slate-600">
                  {editingCondition.description}
                </p>
                <div className="bg-white p-3 rounded-xl border border-sand-200 text-xs text-slate-700 space-y-1">
                  <strong>Non-Diagnostic Disclaimer:</strong>
                  <p className="text-[11px] text-slate-500">{editingCondition.disclaimer}</p>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Review Status: <strong className="text-slate-800">{editingCondition.reviewStatus}</strong>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCondition}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  Save Protocol
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ClinicalContentManager;
