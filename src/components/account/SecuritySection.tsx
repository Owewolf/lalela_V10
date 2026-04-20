import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Smartphone, ShieldAlert, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, Copy, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../../context/FirebaseContext';
import { auth } from '../../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { accountService } from '../../services/accountService';
import { TwoFASetupResponse } from '../../types';

export const SecuritySection: React.FC = () => {
  const { userProfile, updateUserProfile } = useFirebase();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState<TwoFASetupResponse | null>(null);
  const [loading2FA, setLoading2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    if (twoFASetupData?.secret) {
      navigator.clipboard.writeText(twoFASetupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, passwordData.current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.new);
        
        await updateUserProfile({
          last_password_changed: serverTimestamp()
        });

        setShowPasswordForm(false);
        setPasswordData({ current: '', new: '', confirm: '' });
        setStatus({ type: 'success', message: 'Password changed successfully' });
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to change password' });
    }
  };

  const handleToggle2FA = async () => {
    if (!userProfile?.two_factor_enabled) {
      setLoading2FA(true);
      try {
        const setup = await accountService.setup2FA();
        setTwoFASetupData(setup);
        setShow2FASetup(true);
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to initiate 2FA setup' });
      } finally {
        setLoading2FA(false);
      }
    } else {
      // In a real app, this would require re-auth and confirmation
      await updateUserProfile({ two_factor_enabled: false });
      setStatus({ type: 'success', message: '2FA disabled' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    
    setLoading2FA(true);
    try {
      const { verified } = await accountService.verify2FA(verificationCode);
      if (verified) {
        await updateUserProfile({ 
          two_factor_enabled: true,
          two_factor_method: 'App'
        });
        setShow2FASetup(false);
        setTwoFASetupData(null);
        setVerificationCode('');
        setStatus({ type: 'success', message: '2FA enabled successfully' });
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', message: 'Invalid verification code' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Verification failed' });
    } finally {
      setLoading2FA(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-primary">Login & Authentication</h3>
      </div>

      <div className="space-y-4">
        {/* Password Card */}
        <div className="p-5 bg-surface-container-low rounded-3xl flex items-center justify-between group hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Password</p>
              <p className="text-[10px] text-outline font-medium">
                Last changed: {userProfile?.last_password_changed ? (userProfile.last_password_changed instanceof Timestamp ? userProfile.last_password_changed.toDate().toLocaleDateString() : 'Recently') : 'Never'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="px-5 py-2.5 bg-primary/5 text-primary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-colors"
          >
            {showPasswordForm ? 'Cancel' : 'Change'}
          </button>
        </div>

        <AnimatePresence>
          {showPasswordForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4 pt-2"
            >
              <div className="relative">
                <input 
                  type={showCurrentPass ? "text" : "password"} 
                  placeholder="Current Password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button 
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showNewPass ? "text" : "password"} 
                  placeholder="New Password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button 
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input 
                type="password" 
                placeholder="Confirm New Password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="flex gap-3">
                <button 
                  onClick={handleChangePassword}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  Update Password
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2FA Card */}
        <div className="p-5 bg-surface-container-low rounded-3xl flex items-center justify-between group hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-secondary shadow-sm group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Two-Factor Authentication</p>
              <p className="text-[10px] text-outline font-medium">Add an extra layer of security</p>
            </div>
          </div>
          <button 
            onClick={handleToggle2FA}
            disabled={loading2FA}
            className={cn(
              "w-14 h-7 rounded-full relative transition-all duration-300",
              userProfile?.two_factor_enabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-outline-variant",
              loading2FA && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading2FA ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            ) : (
              <div className={cn(
                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm",
                userProfile?.two_factor_enabled ? "right-1" : "left-1"
              )} />
            )}
          </button>
        </div>

        {/* 2FA Setup Flow */}
        <AnimatePresence>
          {show2FASetup && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-surface-container-high/80 rounded-[2.5rem] p-8 space-y-8 border border-primary/10 shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Info className="w-5 h-5" />
                  </div>
                  <h4 className="font-headline font-black tracking-tight">Enable Two-Factor Authentication</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* QR Code Section */}
                    <div className="space-y-4 flex-shrink-0 mx-auto md:mx-0">
                      <div className="p-4 bg-white rounded-[2rem] shadow-inner border border-outline-variant/10">
                        <div className="w-48 h-48 flex items-center justify-center overflow-hidden">
                          {twoFASetupData?.qr_code ? (
                            <img 
                              src={twoFASetupData.qr_code} 
                              alt="2FA QR Code" 
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-surface-container-high rounded-lg flex items-center justify-center text-outline">
                              <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-center font-bold text-outline uppercase tracking-widest">Step 1: Scan QR Code</p>
                    </div>

                    {/* Instructions & Manual Entry */}
                    <div className="flex-1 space-y-6 w-full">
                      <div className="space-y-3">
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          Open your authenticator app (like Google Authenticator or Authy) and scan the QR code. If you can't scan it, enter the key below manually.
                        </p>
                        
                        {twoFASetupData?.secret && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-outline">Step 2: Manual Entry Key</p>
                            <div className="flex items-center gap-2 p-4 bg-white/50 rounded-2xl border border-outline-variant/20 group">
                              <code className="flex-1 font-mono font-bold text-primary tracking-wider text-sm">
                                {twoFASetupData.secret}
                              </code>
                              <button 
                                onClick={handleCopyKey}
                                className="p-2 hover:bg-primary/10 rounded-xl transition-colors text-primary"
                                title="Copy Key"
                              >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-outline">Step 3: Verify & Enable</p>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="000000"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-white border-2 border-outline-variant/20 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.5em] focus:border-primary focus:ring-0 transition-all placeholder:tracking-normal placeholder:text-outline/30"
                              maxLength={6}
                            />
                            {verificationCode.length === 6 && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                              >
                                <CheckCircle2 className="w-6 h-6" />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={handleVerify2FA}
                            disabled={loading2FA || verificationCode.length !== 6}
                            className="flex-1 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                          >
                            {loading2FA ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify & Enable'}
                          </button>
                          <button 
                            onClick={() => {
                              setShow2FASetup(false);
                              setTwoFASetupData(null);
                              setVerificationCode('');
                            }}
                            className="px-8 py-4 bg-surface-container-high text-outline rounded-2xl text-sm font-bold hover:bg-surface-container-highest transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3",
              status.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"
            )}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p className="text-xs font-bold">{status.message}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
};
