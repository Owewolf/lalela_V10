import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, ImageIcon, Plus, Smile, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { uploadImage } from '../../lib/uploadImage';
import { useFirebase } from '../../context/FirebaseContext';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onSendAttachment: (url: string, type: 'image') => void;
  onTyping: (isTyping: boolean) => void;
  onSendLocation?: () => void;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onSendAttachment,
  onTyping,
  onSendLocation,
  placeholder = "Type a message...",
  disabled = false,
  containerClassName,
}) => {
  const { user } = useFirebase();
  const [text, setText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handler = () => {
      const offset = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    viewport.addEventListener('resize', handler);
    viewport.addEventListener('scroll', handler);
    return () => {
      viewport.removeEventListener('resize', handler);
      viewport.removeEventListener('scroll', handler);
    };
  }, []);

  const bottomStyle: React.CSSProperties = {
    bottom: keyboardOffset > 0
      ? `${keyboardOffset + 8}px`
      : 'calc(8px + env(safe-area-inset-bottom))',
  };

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setShowActions(false);
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, 'chat', user.uid);
      onSendAttachment(url, 'image');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setTimeout(() => setUploadError(null), 4000);
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  if (disabled) {
    return (
      <div
        className={cn('p-3 bg-surface/90 backdrop-blur-xl rounded-2xl shadow-xl border border-outline-variant/15', containerClassName)}
        style={bottomStyle}
      >
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold text-center">
          Your trial has expired. Pay R149 once-off for lifetime membership to continue chatting.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('p-3 bg-surface/90 backdrop-blur-xl rounded-2xl shadow-xl border border-outline-variant/15', containerClassName)}
      style={bottomStyle}
    >
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Attachment action sheet */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex gap-2"
          >
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Photo Library
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload error */}
      <AnimatePresence>
        {uploadError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-500 font-medium mb-2 px-1"
          >
            {uploadError}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-1 mb-0.5">
          {/* Photo button — opens Take Photo / Photo Library sheet */}
          <button
            onClick={() => setShowActions(v => !v)}
            className={cn(
              'p-2.5 rounded-xl transition-colors',
              showActions ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low text-outline'
            )}
            aria-label="Add photo"
          >
            {showActions ? <X className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </button>
          {/* Plus button — reserved for files (future) */}
          <button
            onClick={() => onSendLocation?.()}
            className="p-2.5 hover:bg-surface-container-low rounded-xl text-outline transition-colors"
            aria-label="Add file"
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
            placeholder={uploading ? 'Uploading photo...' : placeholder}
            disabled={uploading}
            className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 text-sm text-on-surface placeholder:text-outline-variant resize-none max-h-32 disabled:opacity-50"
          />
          <button className="absolute right-3 bottom-2.5 p-1 text-outline hover:text-primary transition-colors">
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!text.trim() || uploading}
          className={cn(
            'p-3 rounded-2xl transition-all mb-0.5',
            text.trim() && !uploading
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-surface-container-high text-outline cursor-not-allowed'
          )}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
};
