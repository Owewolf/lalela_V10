import React, { useState } from 'react';
import { ShieldAlert, Trash2, LogOut, AlertTriangle, X } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { motion, AnimatePresence } from 'motion/react';

export const DangerZoneSection: React.FC = () => {
  const { signOut, deleteAccount } = useFirebase();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      console.error('Delete failed:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in to delete your account for security reasons.');
      } else {
        setError('Failed to delete account. Please try again later.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <section className="bg-error/5 p-8 rounded-[2.5rem] border border-error/10 space-y-8 relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-error/10 flex items-center justify-center text-error">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-error">Account Management</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 space-y-4 shadow-sm">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-on-surface">Logout Account</h4>
            <p className="text-[10px] text-outline font-medium leading-relaxed">Safely sign out of your account on this device. You can log back in anytime.</p>
          </div>
          <button 
            onClick={signOut}
            className="w-full py-3.5 bg-surface-container-low text-primary rounded-2xl text-xs font-bold hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout Account
          </button>
        </div>

        <div className="p-6 bg-error text-white rounded-3xl space-y-4 shadow-xl shadow-error/20">
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Delete Account</h4>
            <p className="text-[10px] text-white/70 font-medium leading-relaxed">Permanently delete your account and all associated data. This action cannot be undone.</p>
          </div>
          <button 
            onClick={() => setShowConfirmDelete(true)}
            className="w-full py-3.5 bg-white/20 text-white rounded-2xl text-xs font-bold hover:bg-white/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Permanently
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl space-y-6 relative"
            >
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="absolute top-6 right-6 p-2 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-outline" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center text-error animate-pulse">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-headline font-black text-primary tracking-tight">Are you absolutely sure?</h4>
                  <p className="text-sm text-outline font-medium leading-relaxed">
                    This will permanently remove your account and all associated data from the platform. 
                    <span className="block mt-2 font-bold text-error uppercase tracking-widest text-[10px]">
                      You will not be able to use this email to create a new account.
                    </span>
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-error/10 text-error rounded-2xl text-xs font-bold text-center">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full py-4 bg-error text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-error/20 hover:bg-error-dark transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Everything
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-surface-container-low text-primary rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-surface-container-high transition-all active:scale-95"
                >
                  Keep My Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
