import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiClient.js';
import { AIPaywallModal } from './AIPaywallModal.jsx';

export function AIUsageBadge({ className = '', onUpgrade }) {
  const [status, setStatus] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    apiFetch('/ai/subscription/status')
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  if (!status) return null;

  const isPremium = status.isPremium;
  const creditsRemaining = status.creditsRemaining ?? 15;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isPremium) setShowPaywall(true);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
          isPremium
            ? 'bg-purple-100 text-purple-900 border border-purple-200'
            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-purple-300'
        } ${className}`}
        title={isPremium ? 'Active Pro Tier' : 'Click to upgrade for unlimited AI'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isPremium ? 'bg-purple-600 animate-pulse' : 'bg-emerald-500'}`}></span>
        <span>{isPremium ? 'AI Pro' : `${creditsRemaining} AI Left`}</span>
        {!isPremium && <i className="fas fa-sparkles text-[10px] text-purple-600 ml-0.5"></i>}
      </button>

      <AIPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => {
          apiFetch('/ai/subscription/status').then(setStatus);
          onUpgrade?.();
        }}
      />
    </>
  );
}

export default AIUsageBadge;
