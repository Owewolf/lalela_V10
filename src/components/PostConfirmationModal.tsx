import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface PostConfirmationModalProps {
  isOpen: boolean;
  ctaLabel: string;
  postType: string;
  communityName: string;
  title: string;
  themeColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  customTitle?: string;
  customMessage?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}

export const PostConfirmationModal: React.FC<PostConfirmationModalProps> = ({
  isOpen,
  ctaLabel,
  postType,
  communityName,
  title,
  themeColor,
  onConfirm,
  onCancel,
  customTitle,
  customMessage,
  cancelLabel,
  confirmLabel,
  confirmDisabled = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 space-y-5"
          >
            <div className="text-center space-y-2">
              <div className={cn(
                "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4",
                themeColor.replace('bg-', 'bg-').replace('bg-', 'bg-') + '/10'
              )}>
                <AlertCircle className={cn("w-8 h-8", themeColor.replace('bg-', 'text-'))} />
              </div>
              <h3 className="font-headline font-black text-xl text-slate-800">{customTitle ?? 'Confirm Your Post'}</h3>
              {customMessage ? (
                <p className="text-sm text-slate-500 leading-relaxed">{customMessage}</p>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed">
                  You are about to <span className="font-bold text-slate-700">{ctaLabel}</span> in{' '}
                  <span className="font-bold italic text-slate-700">{communityName}</span>.
                  Please confirm this is correct.
                </p>
              )}
              {title && (
                <div className="mt-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">{postType}</p>
                  <p className="text-sm font-bold text-slate-700 line-clamp-2">{title}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
              >
                {cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                disabled={confirmDisabled}
                className={cn(
                  "flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2",
                  confirmDisabled && "opacity-60 cursor-not-allowed active:scale-100",
                  themeColor,
                  themeColor === 'bg-error' && 'hover:bg-error/90',
                  themeColor === 'bg-blue-600' && 'hover:bg-blue-700',
                  themeColor === 'bg-amber-600' && 'hover:bg-amber-700',
                  themeColor === 'bg-emerald-600' && 'hover:bg-emerald-700',
                  themeColor === 'bg-secondary' && 'hover:bg-secondary/90'
                )}
              >
                {confirmLabel ?? ctaLabel}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
