import React, { useState } from 'react';
import { ShieldAlert, Trash2, LogOut } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { PostConfirmationModal } from '../PostConfirmationModal';

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

      {error && (
        <div className="p-4 bg-error/10 text-error rounded-2xl text-xs font-bold text-center">
          {error}
        </div>
      )}

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

      <PostConfirmationModal
        isOpen={showConfirmDelete}
        ctaLabel="Delete Everything"
        postType="Account"
        communityName="Lalela"
        title="Permanent Account Deletion"
        themeColor="bg-error"
        customTitle="Are you absolutely sure?"
        customMessage="This will permanently remove your account and all associated data. You will not be able to use this email to create a new account."
        cancelLabel="Keep My Account"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Everything'}
        confirmDisabled={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (isDeleting) return;
          setShowConfirmDelete(false);
          setError(null);
        }}
      />
    </section>
  );
};
