import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { accountService } from '../services/accountService';

interface MockStripeCheckoutProps {
  type: 'membership' | 'community';
  targetId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MockStripeCheckout: React.FC<MockStripeCheckoutProps> = ({ type, targetId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { licenseCommunity } = useCommunity();
  const { updateUserProfile } = useFirebase();

  const price = type === 'membership' ? 'R149.00' : 'R349.00';
  const title = type === 'membership' ? 'Lifetime Membership' : 'Community Creation & Leadership';
  const description = type === 'membership' 
    ? 'Once-off payment for lifetime access to the Lalela platform.'
    : 'Once-off payment to create and own a community (includes lifetime membership).';

  const handlePay = async () => {
    setLoading(true);
    // Simulate Stripe processing delay
    try {
      if (type === 'community' && targetId) {
        await licenseCommunity(targetId);
      } else if (type === 'membership') {
        await updateUserProfile({
          license_type: 'SELF',
          license_status: 'LICENSED',
          status: 'ACTIVE'
        });
      }
      await accountService.simulateSuccessfulPayment(type, targetId);
      setLoading(false);
      setSuccess(true);
      // Simulate webhook completion delay before redirecting back
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Payment failed to simulate via webhook:', error);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-primary">Payment Successful</h2>
          <p className="text-on-surface-variant font-medium">Redirecting back to Lalela...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-outline-variant/20">
        
        {/* Header */}
        <div className="bg-primary p-6 text-white text-center relative">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="absolute left-6 top-6 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Lalela Checkout (Mock)</h2>
          <p className="text-sm text-white/80 mt-1 uppercase tracking-widest font-bold text-[10px]">Test Environment</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-on-surface">{title}</h3>
            <p className="text-sm text-on-surface-variant">{description}</p>
          </div>

          <div className="py-6 border-y border-outline-variant/10 text-center">
            <div className="text-4xl font-black text-primary">{price}</div>
            <div className="text-xs font-bold text-outline uppercase tracking-widest mt-2">Paying Once-Off</div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${price}`
            )}
          </button>

          <p className="text-center text-[10px] text-outline font-medium">
            This is a mock Stripe checkout for demonstration purposes. No real money will be charged.
          </p>
        </div>
      </div>
    </div>
  );
};
