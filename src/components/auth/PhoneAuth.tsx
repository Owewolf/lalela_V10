import React, { useState, useEffect } from 'react';
import { Phone, KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFirebase } from '../../context/FirebaseContext';

interface PhoneAuthProps {
  onSuccess?: (user: any) => Promise<void> | void;
  onError?: (error: string) => void;
}

export const PhoneAuth: React.FC<PhoneAuthProps> = ({ onSuccess, onError }) => {
  const { setupRecaptcha, signInWithPhone, verifySmsCode, confirmationResult, clearPhoneAuth } = useFirebase();
  const [phoneNumber, setPhoneNumber] = useState('+27');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    setupRecaptcha('recaptcha-container');
    
    return () => {
       clearPhoneAuth();
    };
  }, [setupRecaptcha, clearPhoneAuth]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    try {
      await signInWithPhone(phoneNumber);
    } catch (err: any) {
      console.error("Phone auth error:", err);
      const msg = err.message || "Failed to send code";
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsLoading(true);
    try {
      const result = await verifySmsCode(otpCode);
      await onSuccess?.(result.user);
    } catch (err: any) {
      console.error("OTP verify error:", err);
      const msg = err.message || "Failed to verify code";
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div id="recaptcha-container"></div>
      
      {localError && (
        <p className="text-xs text-error font-medium bg-error/5 p-4 rounded-2xl border border-error/10 text-center">
          {localError}
        </p>
      )}

      {!confirmationResult ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Mobile Number</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+27..."
                required
                className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || phoneNumber.length < 9}
            className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send SMS Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">6-Digit Code</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                className="w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary tracking-widest text-center text-xl"
              />
            </div>
            <p className="text-xs text-on-surface-variant text-center mt-2 px-2 leading-relaxed">
              We've sent a 6-digit code to <strong>{phoneNumber}</strong>
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
            className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              clearPhoneAuth();
              setOtpCode('');
            }}
            disabled={isLoading}
            className="w-full py-3 text-outline hover:text-primary transition-colors text-sm font-bold flex items-center justify-center gap-2 mt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Change Mobile Number
          </button>
        </form>
      )}
    </div>
  );
};
