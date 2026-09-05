import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_ANIM_MS = 180;
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable Modal component
 * Props:
 *   isOpen     - boolean
 *   onClose    - function
 *   title      - string (optional)
 *   children   - JSX
 *   size       - 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 *   noPadding  - skip inner padding (for custom layouts)
 *   hideClose  - suppress the default floating close button, for callers
 *                that render their own close control inside a custom header
 *                (without this, omitting `title` produces two overlapping
 *                close buttons)
 */
export function Modal({ isOpen, onClose, title, ariaLabel, children, size = 'md', noPadding = false, hideClose = false }) {
  const overlayRef = useRef(null);
  const boxRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement;
      setShouldRender(true);
      setClosing(false);
    } else if (shouldRender) {
      setClosing(true);
      const t = setTimeout(() => setShouldRender(false), CLOSE_ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Move focus into the dialog on open, and back to the trigger on close.
  useEffect(() => {
    if (!shouldRender) {
      lastFocusedRef.current?.focus?.();
      return;
    }
    const box = boxRef.current;
    const target = box?.querySelector(FOCUSABLE_SELECTOR) || box;
    target?.focus?.();
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(boxRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!boxRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

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
      className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        animation: closing ? `overlayFadeOut ${CLOSE_ANIM_MS}ms ease-in both` : 'fadeIn 0.15s ease-out',
        pointerEvents: closing ? 'none' : 'auto',
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        className={`modal-box bg-white rounded-t-[2rem] sm:rounded-3xl w-full ${SIZE_CLASS[size]} max-h-[92vh] max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-t sm:border border-slate-100 outline-none safe-area-pb sm:pb-0`}
        style={{ animation: closing ? `modalSlideDown ${CLOSE_ANIM_MS}ms ease-in both` : 'slideUp 0.2s ease-out' }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-aubergine-900 to-aubergine-700 shrink-0">
            <h3 id={titleId} className="font-semibold text-base sm:text-lg text-white truncate pr-2">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shrink-0 active:scale-95 touch-target"
            >
              <i className="fas fa-xmark text-base"></i>
            </button>
          </div>
        )}
        {!title && !hideClose && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95 touch-target"
          >
            <i className="fas fa-xmark text-base"></i>
          </button>
        )}
        <div className={`overflow-y-auto overscroll-contain ${noPadding ? '' : 'p-4 sm:p-6'}`}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalSlideDown { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(12px) scale(0.98); } }
        @media (prefers-reduced-motion: reduce) {
          .modal-overlay, .modal-box { animation: none !important; }
        }
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
    <Modal isOpen={isOpen} onClose={onClose} size="sm" ariaLabel={title}>
      <div className="text-center space-y-4">
        <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl ${confirmStyle === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-aubergine-50 text-aubergine-600'}`}>
          <i className={`fas ${confirmStyle === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-base sm:text-lg">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed font-normal">{message}</p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${STYLE[confirmStyle]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
