import React, { useState, useEffect } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { Modal } from '../Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../Toast.jsx';
import { getStoredCurrency } from '../../lib/currency.js';

const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'sandbox';
let cashfreePromise = null;
function getCashfree() {
  if (!cashfreePromise) cashfreePromise = loadCashfree({ mode: CASHFREE_MODE });
  return cashfreePromise;
}

export function AICreditTopUpModal({ isOpen, onClose, onTopUpSuccess, currentCredits = 0 }) {
  const { toast } = useToast?.() || { toast: (msg) => alert(msg) };
  const [packs, setPacks] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState('pack_100');
  const [loading, setLoading] = useState(false);
  const userCurrency = getStoredCurrency();

  useEffect(() => {
    if (isOpen) {
      apiFetch('/ai/credits/packs')
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setPacks(res);
          } else {
            // Fallback canonical packs
            const isUsd = userCurrency === 'USD';
            setPacks([
              { id: 'pack_100', credits: 100, priceFormatted: isUsd ? '$3' : '₹200', name: '100 AI Credits', popular: true },
              { id: 'pack_250', credits: 250, priceFormatted: isUsd ? '$6' : '₹450', name: '250 AI Credits' },
              { id: 'pack_500', credits: 500, priceFormatted: isUsd ? '$10' : '₹800', name: '500 AI Credits' },
              { id: 'pack_1000', credits: 1000, priceFormatted: isUsd ? '$18' : '₹1,500', name: '1,000 AI Credits' },
            ]);
          }
        })
        .catch(() => {
          const isUsd = userCurrency === 'USD';
          setPacks([
            { id: 'pack_100', credits: 100, priceFormatted: isUsd ? '$3' : '₹200', name: '100 AI Credits', popular: true },
            { id: 'pack_250', credits: 250, priceFormatted: isUsd ? '$6' : '₹450', name: '250 AI Credits' },
            { id: 'pack_500', credits: 500, priceFormatted: isUsd ? '$10' : '₹800', name: '500 AI Credits' },
            { id: 'pack_1000', credits: 1000, priceFormatted: isUsd ? '$18' : '₹1,500', name: '1,000 AI Credits' },
          ]);
        });
    }
  }, [isOpen, userCurrency]);

  if (!isOpen) return null;

  const selectedPack = packs.find((p) => p.id === selectedPackId) || packs[0];

  const handleCheckout = async () => {
    if (!selectedPackId) return;
    setLoading(true);

    try {
      const order = await apiFetch('/ai/credits/topup', {
        method: 'POST',
        body: { packId: selectedPackId },
      });

      if (!order?.orderId) {
        throw new Error('Could not initiate top-up checkout session.');
      }

      if (order.paymentSessionId) {
        const cashfree = await getCashfree();
        const checkoutOptions = {
          paymentSessionId: order.paymentSessionId,
          redirectTarget: '_modal',
        };

        const result = await cashfree.checkout(checkoutOptions);
        if (result?.error) {
          throw new Error(result.error.message || 'Payment was cancelled or failed.');
        }

        // Verify and activate top-up
        await apiFetch('/ai/credits/topup/activate', {
          method: 'POST',
          body: { orderId: order.orderId },
        });
      } else {
        // Direct sandbox or demo activation
        await apiFetch('/ai/credits/topup/activate', {
          method: 'POST',
          body: { orderId: order.orderId },
        });
      }

      toast(`Success! ${selectedPack?.credits || 100} credits added to your AI balance.`, 'success');
      onTopUpSuccess?.();
      onClose?.();
    } catch (err) {
      toast(err?.message || 'Top-up checkout failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Top-Up AI Credits" maxWidth="max-w-lg">
      <div className="space-y-5 p-1">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Instant AI Credits</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Credits are added immediately and never expire during your billing cycle.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Balance</span>
            <span className="text-lg font-black text-slate-900 font-mono">{currentCredits} uses</span>
          </div>
        </div>

        {/* Top-up Packs Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packs.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-100 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/50'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-3 text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                    Popular
                  </span>
                )}
                <div>
                  <span className="text-base font-black text-slate-900 font-mono block">
                    {pack.credits} Credits
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    1 credit = 1 full AI consultation
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black text-purple-950 font-mono">
                    {pack.priceFormatted}
                  </span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <i className="fas fa-check text-[9px]"></i>}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pack Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            Selected: <strong>{selectedPack?.credits || 100} Credits</strong>
          </span>
          <span className="font-bold text-slate-900">
            Total: {selectedPack?.priceFormatted}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-1/3 py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="w-2/3 py-2.5 px-4 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <i className="fas fa-bolt"></i>
                <span>Top-Up {selectedPack?.priceFormatted}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
