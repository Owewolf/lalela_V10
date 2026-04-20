import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Plus, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onSendImage?: () => void;
  onSendLocation?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({ 
  onSend, 
  onTyping, 
  onSendImage,
  onSendLocation,
  placeholder = "Type a message...",
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    onTyping(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Typing status logic
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 3000);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (disabled) {
    return (
      <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10">
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold">
          Your membership has expired. Upgrade to continue chatting.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-1 mb-0.5">
          <button 
            onClick={() => onSendImage?.()}
            className="p-2.5 hover:bg-surface-container-low rounded-xl text-outline transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onSendLocation?.()}
            className="p-2.5 hover:bg-surface-container-low rounded-xl text-outline transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-surface-container-low rounded-2xl border border-outline-variant/10 focus-within:border-primary/30 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 text-sm text-on-surface placeholder:text-outline-variant resize-none max-h-32"
          />
          <button className="absolute right-3 bottom-2.5 p-1 text-outline hover:text-primary transition-colors">
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!text.trim()}
          className={cn(
            "p-3 rounded-2xl transition-all mb-0.5",
            text.trim() 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-surface-container-high text-outline cursor-not-allowed"
          )}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};
