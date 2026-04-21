import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import { useFirebase } from '../../context/FirebaseContext';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isSequential?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSequential }) => {
  const { user } = useFirebase();
  const isMe = message.senderId === user?.uid;

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/10">
          <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[70%]",
        isMe ? "ml-auto items-end" : "mr-auto items-start",
        !isSequential && "mt-4"
      )}
    >
      {!isMe && !isSequential && (
        <div className="flex items-center gap-2 mb-1 ml-1">
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{message.senderName}</span>
          {message.senderRole && (
            <span className={cn(
              "px-1 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter",
              message.senderRole === 'Admin' ? "bg-error text-white" : 
              message.senderRole === 'Moderator' ? "bg-secondary text-white" :
              message.senderRole === 'Liaison' ? "bg-primary text-white" :
              "bg-primary/10 text-primary"
            )}>
              {message.senderRole}
            </span>
          )}
        </div>
      )}

      <div className={cn(
        "relative px-4 py-2.5 rounded-2xl shadow-sm",
        isMe 
          ? "bg-primary text-white rounded-tr-none" 
          : "bg-surface-container-high text-on-surface rounded-tl-none border border-outline-variant/5"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
        
        <div className={cn(
          "flex items-center gap-1 mt-1 justify-end",
          isMe ? "text-white/60" : "text-outline"
        )}>
          <span className="text-[9px] font-medium">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <div className="flex items-center">
              {message.status === 'read' ? (
                <CheckCheck className="w-3 h-3 text-white" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
