import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';

/* ─── Data ───────────────────────────────────── */
const PERMISSION_CONFIG = [
  {
    key: 'cycleWindow',
    label: 'Sync Cycle Phase & Ovulation Window',
    sub: 'Shares high-level phase (e.g. "Luteal Phase") — no clinical details.',
    icon: 'fa-circle-dot',
    color: 'text-rose-600',
  },
  {
    key: 'appointments',
    label: 'Share Consultation Appointment Cards',
    sub: 'Date, time, and doctor name only.',
    icon: 'fa-calendar-check',
    color: 'text-aubergine-600',
  },
  {
    key: 'detailedRx',
    label: 'Share Medical EMR & Prescriptions',
    sub: 'Off by default for absolute privacy.',
    icon: 'fa-file-medical',
    color: 'text-slate-500',
    sensitive: true,
  },
];

function PatientFamily() {
  const toast = useToast();
  const { careConnections, inviteConnection, updateConnectionPermissions, removeConnection } = useClinicData();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRelation, setInviteRelation] = useState('Partner / Spouse');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [sensitiveToggle, setSensitiveToggle] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [inviting, setInviting] = useState(false);

  const applyPermissionToggle = async (conn, perm, next) => {
    try {
      await updateConnectionPermissions(conn.id, { ...conn.permissions, [perm]: next });
      toast(next ? `"${PERMISSION_CONFIG.find(p => p.key === perm)?.label}" enabled.` : 'Permission revoked.', next ? 'success' : 'info');
    } catch {
      toast('Failed to update permission. Please try again.', 'error');
    }
  };

  const togglePermission = (conn, perm) => {
    const next = !conn.permissions[perm];

    if (perm === 'detailedRx' && next) {
      // Warn before enabling sensitive permission
      setSensitiveToggle({ conn, perm });
      return;
    }

    applyPermissionToggle(conn, perm, next);
  };

  const confirmSensitiveToggle = () => {
    if (!sensitiveToggle) return;
    applyPermissionToggle(sensitiveToggle.conn, sensitiveToggle.perm, true);
    setSensitiveToggle(null);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const newConn = await inviteConnection(inviteEmail, inviteRelation);
      setShareLink(`${window.location.origin}/invite/${newConn.inviteToken}`);
      toast(`Invitation sent to ${inviteEmail}!`, 'success');
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      toast(err.message || 'Failed to send invitation. Please try again.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleDisconnect = async () => {
    const target = disconnectTarget;
    setDisconnectTarget(null);
    try {
      await removeConnection(target.id);
      toast(`${target.name} has been disconnected from your care circle.`, 'info');
    } catch {
      toast('Failed to disconnect. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Partner & Care Circle Support</h1>
          <p className="text-sm text-slate-500">Securely sync cycle phases with a partner while maintaining complete medical privacy.</p>
        </div>
        <button onClick={() => setShowInviteForm(!showInviteForm)}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm">
          <i className={`fas ${showInviteForm ? 'fa-xmark' : 'fa-user-plus'}`}></i>
          {showInviteForm ? 'Cancel' : 'Invite Partner'}
        </button>
      </div>

      {/* Educational Card */}
      <div className="bg-gradient-to-r from-[#2A1647] via-[#3A1C78] to-[#2A1647] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute left-0 sm:left-auto sm:right-0 top-0 opacity-10 text-9xl transform translate-x-12 translate-y-2">
          <i className="fas fa-heart"></i>
        </div>
        <h3 className="font-bold text-base mb-2 flex items-center gap-2"><i className="fas fa-lightbulb text-amber-300"></i> Did You Know? (Cycle Syncing)</h3>
        <p className="text-xs text-aubergine-200 leading-relaxed max-w-2xl">
          Hormonal cycles significantly affect energy levels, insulin responses, and stress thresholds. Sharing your high-level fertility phases helps your partner plan meals, exercise, and active support — without accessing your clinical EMR or prescriptions.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          {['Follicular = High Energy', 'Luteal = Rest & Recovery', 'Ovulation = Peak Mood'].map(p => (
            <span key={p} className="text-[10px] font-bold bg-white/10 border border-white/10 px-3 py-1 rounded-full text-aubergine-200">{p}</span>
          ))}
        </div>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <form onSubmit={handleInvite} className="bg-white border border-aubergine-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <h2 className="font-bold text-slate-800">Invite a Trusted Connection</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Partner's Email *</label>
              <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="partner@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Relationship</label>
              <select value={inviteRelation} onChange={e => setInviteRelation(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
                {['Partner / Spouse', 'Trusted Caregiver', 'Family Member', 'Close Friend'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <i className="fas fa-shield-halved mt-0.5 flex-shrink-0"></i>
            Your partner will only see what you explicitly allow. Medical records remain private by default.
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={inviting}
              className="bg-aubergine-700 hover:bg-aubergine-800 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
              <i className="fas fa-paper-plane"></i> {inviting ? 'Sending…' : 'Send Invitation'}
            </button>
            <button type="button" onClick={() => setShowInviteForm(false)}
              className="border border-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Share link banner */}
      {shareLink && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
          <div>
            <p className="font-bold text-emerald-800 text-sm">Invitation Link Generated</p>
            <p className="text-xs text-emerald-700 font-mono mt-0.5">{shareLink}</p>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(shareLink); toast('Invite link copied!', 'success'); }}
            className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-colors flex-shrink-0">
            <i className="fas fa-copy"></i> Copy
          </button>
          <button onClick={() => setShareLink('')} className="text-emerald-600 hover:text-emerald-800 flex-shrink-0"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Connections */}
      <div className="grid md:grid-cols-2 gap-6">
        {careConnections.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-aubergine-400 to-aubergine-600"></div>

            {/* Connection Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center font-black text-base">
                  {c.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c.relation} · Connected {c.invitedOn}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.status === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {c.status}
              </span>
            </div>

            {/* Permission Toggles */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50 space-y-3 mb-4 flex-1">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <i className="fas fa-sliders text-aubergine-500"></i> Configure Shared Details:
              </h4>
              {PERMISSION_CONFIG.map(perm => {
                const isOn = c.permissions[perm.key];
                return (
                  <div key={perm.key} className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all ${isOn ? 'bg-white border border-aubergine-100' : 'hover:bg-white/50'}`}>
                    <div className="flex items-start gap-2 flex-1">
                      <i className={`fas ${perm.icon} ${perm.color} mt-0.5 text-xs w-4 text-center`}></i>
                      <div>
                        <p className={`text-xs font-bold ${perm.sensitive && !isOn ? 'text-slate-500' : 'text-slate-700'}`}>{perm.label}</p>
                        <p className="text-[10px] text-slate-500">{perm.sub}</p>
                      </div>
                    </div>
                    <button onClick={() => togglePermission(c, perm.key)}
                      className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-all border ${isOn ? 'bg-aubergine-600 border-aubergine-600' : 'bg-slate-200 border-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${isOn ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {c.status !== 'Connected' && (
                // There's no email/notification backend to actually "resend"
                // anything — but the connection's real invite token is
                // already in hand, so regenerating the shareable link is a
                // genuine action instead of a fake "email sent" toast.
                <button onClick={() => { setShareLink(`${window.location.origin}/invite/${c.inviteToken}`); toast(`Invite link for ${c.name} ready to share.`, 'info'); }}
                  className="flex-1 bg-aubergine-50 hover:bg-aubergine-100 border border-aubergine-200 text-aubergine-700 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <i className="fas fa-link"></i> Get Invite Link
                </button>
              )}
              <button onClick={() => setDisconnectTarget(c)}
                className={`${c.status !== 'Connected' ? 'flex-1' : 'w-full'} bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5`}>
                <i className="fas fa-user-xmark"></i> Disconnect
              </button>
            </div>
          </div>
        ))}

        {/* Add more card */}
        <div
          onClick={() => setShowInviteForm(true)}
          className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-aubergine-300 hover:bg-aubergine-50/20 transition-all group min-h-48">
          <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-aubergine-100 flex items-center justify-center transition-colors">
            <i className="fas fa-user-plus text-slate-500 group-hover:text-aubergine-600 text-xl transition-colors"></i>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-500 group-hover:text-aubergine-700 transition-colors text-sm">Invite Another Person</p>
            <p className="text-xs text-slate-500 mt-0.5">Add a caregiver or family member</p>
          </div>
        </div>
      </div>

      {/* Disconnect Confirm */}
      <ConfirmModal
        isOpen={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
        title={`Disconnect ${disconnectTarget?.name}?`}
        message="They will lose access to all shared information. This can be undone by inviting them again."
        confirmLabel="Disconnect"
        confirmStyle="danger"
      />

      {/* Sensitive Permission Confirm */}
      <ConfirmModal
        isOpen={!!sensitiveToggle}
        onClose={() => setSensitiveToggle(null)}
        onConfirm={confirmSensitiveToggle}
        title="Share Medical EMR & Prescriptions?"
        message="Enabling this will share your full medical records including prescriptions. Continue?"
        confirmLabel="Enable Sharing"
        confirmStyle="danger"
      />
    </div>
  );
}

export default PatientFamily;
