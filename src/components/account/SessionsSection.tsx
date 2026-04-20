import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, LogOut, ShieldAlert, MapPin, Globe, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../../context/FirebaseContext';
import { cn } from '../../lib/utils';
import { accountService } from '../../services/accountService';
import { UserSession } from '../../types';

export const SessionsSection: React.FC = () => {
  const { user } = useFirebase();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      const data = await accountService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await accountService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to logout session:', error);
    }
  };

  const handleLogoutAll = async () => {
    if (sessions.length <= 1) return;
    setIsRevokingAll(true);
    try {
      await accountService.revokeAllOtherSessions();
      setSessions(prev => prev.filter(s => s.is_current));
    } catch (error) {
      console.error('Failed to logout all sessions:', error);
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-primary">Active Sessions</h3>
        </div>
        {sessions.length > 1 && (
          <button 
            onClick={handleLogoutAll}
            disabled={isRevokingAll}
            className="text-[10px] font-black uppercase tracking-widest text-error hover:underline disabled:opacity-50"
          >
            {isRevokingAll ? 'Revoking...' : 'Logout All Others'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-xs text-outline font-medium">
          You're currently logged into these devices. Revoke any session you don't recognize.
        </p>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sessions.length > 0 ? sessions.map((session) => (
              <motion.div 
                key={session.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-5 bg-surface-container-low rounded-3xl flex items-center justify-between group hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-outline shadow-sm group-hover:scale-110 transition-transform">
                    {session.device.toLowerCase().includes('phone') || session.device.toLowerCase().includes('mobile') ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{session.device || 'Unknown Device'}</p>
                      {session.is_current && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase rounded-full border border-emerald-500/20">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-outline">
                        <MapPin className="w-3 h-3" />
                        <span>{session.location || 'Unknown Location'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-outline">
                        <Globe className="w-3 h-3" />
                        <span>{session.ip || '102.132.x.x'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-outline">
                        <span className="w-1 h-1 rounded-full bg-outline/30" />
                        <span>{new Date(session.last_active).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {!session.is_current && (
                  <button 
                    onClick={() => handleLogoutSession(session.id)}
                    className="p-3 text-outline hover:text-error hover:bg-error/10 rounded-xl transition-all active:scale-90"
                    title="Revoke Session"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            )) : (
              <div className="p-6 bg-surface-container-low rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-outline/20">
                  <Laptop className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-outline">No active sessions found</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
