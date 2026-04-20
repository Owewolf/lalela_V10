import React from 'react';
import { Home, FileText, MessageSquare, Store, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasUnread?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, hasUnread }) => {
  const navItems = [
    { id: 'home', icon: <Home className="w-6 h-6" />, label: 'Home' },
    { id: 'posts', icon: <FileText className="w-6 h-6" />, label: 'Posts' },
    { id: 'chat', icon: <MessageSquare className="w-6 h-6" />, label: 'Chat' },
    { id: 'market', icon: <Store className="w-6 h-6" />, label: 'Market' },
    { id: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-4 pb-8 pt-2 bg-surface/80 backdrop-blur-xl border-t border-surface-container shadow-ambient rounded-t-[2.5rem]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const isChat = item.id === 'chat';
        
        if (isChat) {
          return (
            <button 
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 w-16 h-16 rounded-full -mt-10 shadow-2xl border-4 border-surface z-50",
                isActive ? "clay-gradient text-white scale-110" : "bg-secondary text-white",
                !isActive && hasUnread && "animate-pulse"
              )}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
            </button>
          );
        }

        return (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-300 p-2 min-w-[64px]",
              isActive ? "text-primary scale-110" : "text-on-surface-variant hover:text-secondary"
            )}
          >
            <div className={cn("mb-1", isActive && "fill-current")}>
              {item.icon}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tighter",
              isActive ? "text-primary" : "text-on-surface-variant/60"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
