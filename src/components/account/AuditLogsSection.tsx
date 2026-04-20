import React, { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, LogOut, ShieldAlert, CheckCircle2, AlertTriangle, Clock, History, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useFirebase } from '../../context/FirebaseContext';
import { cn } from '../../lib/utils';
import { accountService } from '../../services/accountService';

export const AuditLogsSection: React.FC = () => {
  const { user } = useFirebase();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await accountService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'password_change': return <Key className="w-4 h-4" />;
      case '2fa_toggle': return <Smartphone className="w-4 h-4" />;
      case 'login': return <Shield className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'failed_login': return <ShieldAlert className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'failed_login': return 'text-error bg-error/10';
      case 'password_change': return 'text-primary bg-primary/10';
      case '2fa_toggle': return 'text-secondary bg-secondary/10';
      case 'login': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-outline bg-outline/10';
    }
  };

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-primary">Security Activity</h3>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-secondary hover:underline">View All</button>
      </div>

      <div className="space-y-4">
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log, idx) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", getLogColor(log.type))}>
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{log.message || 'Security event'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-outline">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.ip && (
                      <div className="flex items-center gap-1 text-[10px] text-outline">
                        <Shield className="w-3 h-3" />
                        <span>{log.ip}</span>
                      </div>
                    )}
                  </div>
                </div>
                {log.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : log.status === 'failure' ? (
                  <AlertTriangle className="w-4 h-4 text-error" />
                ) : null}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-surface-container-low rounded-3xl flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-outline-variant/10">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-outline/20">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-outline">No recent activity</p>
              <p className="text-[10px] text-outline/60">Your security events will appear here</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
