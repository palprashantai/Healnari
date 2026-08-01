import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable Modal component
 * Props:
 *   isOpen     - boolean
 *   onClose    - function
 *   title      - string (optional)
 *   children   - JSX
 *   size       - 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 *   noPadding  - skip inner padding (for custom layouts)
 */
export function Modal({ isOpen, onClose, title, children, size = 'md', noPadding = false }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const SIZE_CLASS = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className={`bg-white rounded-3xl w-full ${SIZE_CLASS[size]} shadow-2xl overflow-hidden border border-slate-100`}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-aubergine-900 to-aubergine-700">
            <h3 className="font-black text-lg text-white">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        )}
        <div className={noPadding ? '' : 'p-6'}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>,
    document.body
  );
}

/** Confirmation dialog helper */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmStyle = 'danger' }) {
  const STYLE = {
    danger:   'bg-rose-600 hover:bg-rose-700 text-white',
    primary:  'bg-aubergine-600 hover:bg-aubergine-700 text-white',
    success:  'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center space-y-4">
        <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl ${confirmStyle === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-aubergine-50 text-aubergine-600'}`}>
          <i className={`fas ${confirmStyle === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-lg">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${STYLE[confirmStyle]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
