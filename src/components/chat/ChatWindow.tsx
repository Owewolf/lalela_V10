import React, { useRef, useEffect } from 'react';
import { Message, Conversation } from '../../types';
import { MessageBubble } from './MessageBubble';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../../context/FirebaseContext';

interface ChatWindowProps {
  messages: Message[];
  conversation: Conversation;
  isTyping?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, conversation, isTyping }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useFirebase();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 pb-40 space-y-1 scroll-smooth"
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
          <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-sm font-medium">Say hello to start the conversation!</p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const prevMsg = messages[idx - 1];
        const isSequential = prevMsg && prevMsg.senderId === msg.senderId && 
          (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 300000); // 5 mins

        return (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isSequential={isSequential}
          />
        );
      })}

      <AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 ml-1 mt-4"
          >
            <div className="flex gap-1 bg-surface-container-high px-3 py-2 rounded-full rounded-tl-none border border-outline-variant/10">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-1.5 h-1.5 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-primary rounded-full"
              />
            </div>
            <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">Typing...</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-4" />
    </div>
  );
};
