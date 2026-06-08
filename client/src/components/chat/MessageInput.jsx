import { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPaperAirplane,
  HiFaceSmile,
  HiPaperClip,
  HiXMark,
  HiPhoto,
  HiArrowUturnLeft,
} from 'react-icons/hi2';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '../../utils/constants';
import toast from 'react-hot-toast';

const MessageInput = ({ chatId }) => {
  const { sendMessage, replyingTo, setReplyingTo } = useChat();
  const { socket } = useSocket();
  const { isDark } = useTheme();

  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [sending, setSending] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);

  // Focus input when chat changes
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      // Stop typing when leaving chat
      if (socket) {
        socket.emit('stop_typing', { chatId });
      }
    };
  }, [chatId, socket]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up object URLs when files change
  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => {
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [filePreviews]);

  // Debounced stop-typing emitter
  const emitStopTyping = useDebouncedCallback(() => {
    if (socket) socket.emit('stop_typing', { chatId });
  }, 2000);

  const handleInputChange = (e) => {
    setContent(e.target.value);

    // Emit typing event
    if (socket && e.target.value.length > 0) {
      socket.emit('typing', { chatId });
      emitStopTyping();
    } else if (socket) {
      socket.emit('stop_typing', { chatId });
    }
  };

  const handleEmojiClick = (emojiData) => {
    setContent((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const previews = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 10MB).`);
        continue;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: file type not supported.`);
        continue;
      }
      validFiles.push(file);

      // Generate preview
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        const reader = new FileReader();
        const index = validFiles.length - 1;
        reader.onload = (ev) => {
          setFilePreviews((prev) => {
            const updated = [...prev];
            updated[index] = ev.target.result;
            return updated;
          });
        };
        reader.readAsDataURL(file);
        previews.push(null); // placeholder, will be updated by reader
      } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
        previews.push(URL.createObjectURL(file));
      } else {
        previews.push(null);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setFilePreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const preview = prev[index];
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearFiles = () => {
    filePreviews.forEach((preview) => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e?.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent && selectedFiles.length === 0) return;
    if (sending) return;

    setSending(true);
    const replyToId = replyingTo?._id || null;

    try {
      // If there are files, send each file as a separate message
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          // Attach text content only to the first file message
          const msgContent = i === 0 ? trimmedContent : '';
          // Attach replyTo only to the first message
          const thisReplyTo = i === 0 ? replyToId : null;
          await sendMessage(chatId, msgContent, messageType, file, thisReplyTo);
        }
      } else {
        // Text-only message
        await sendMessage(chatId, trimmedContent, 'text', null, replyToId);
      }

      setContent('');
      clearFiles();
      setShowEmoji(false);
      setReplyingTo(null);

      // Stop typing
      if (socket) socket.emit('stop_typing', { chatId });
    } catch {
      // Error handled in context
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  return (
    <div className="shrink-0 border-t theme-border-subtle theme-bg-secondary backdrop-blur-sm">
      {/* Reply preview bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 border-b theme-border-subtle">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500/15">
                <HiArrowUturnLeft className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0 pl-3 border-l-2 border-primary-400">
                <p className="text-xs font-semibold text-primary-400">
                  {replyingTo.sender?.name || 'User'}
                </p>
                <p className="text-xs theme-text-muted truncate mt-0.5">
                  {replyingTo.messageType === 'image'
                    ? '📷 Photo'
                    : replyingTo.messageType === 'file'
                      ? `📎 ${replyingTo.fileName || 'File'}`
                      : replyingTo.content || 'Message'}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1.5 rounded-lg theme-bg-hover theme-text-muted hover:text-red-400 transition-colors"
                title="Cancel reply"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File previews */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-3 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 p-2 theme-bg-tertiary rounded-lg max-w-xs"
                >
                  {filePreviews[index] && file.type.startsWith('image/') ? (
                    <img
                      src={filePreviews[index]}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : filePreviews[index] && file.type.startsWith('video/') ? (
                    <video
                      src={filePreviews[index]}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                      muted
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg theme-bg flex items-center justify-center shrink-0">
                      <HiPaperClip className="w-5 h-5 theme-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs theme-text truncate">{file.name}</p>
                    <p className="text-xs theme-text-muted">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-0.5 rounded-full theme-bg-hover theme-text-muted shrink-0"
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {selectedFiles.length > 1 && (
              <button
                onClick={clearFiles}
                className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
              >
                Clear all ({selectedFiles.length} files)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <form onSubmit={handleSend} className="flex items-end gap-2 p-3">
        {/* Emoji toggle */}
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2.5 rounded-xl transition-colors ${
              showEmoji
                ? 'bg-primary-500/20 text-primary-400'
                : 'theme-bg-hover theme-text-muted'
            }`}
          >
            <HiFaceSmile className="w-5 h-5" />
          </button>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-14 left-0 z-50"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={isDark ? 'dark' : 'light'}
                  width={320}
                  height={400}
                  searchPlaceholder="Search emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* File upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl theme-bg-hover theme-text-muted transition-colors"
        >
          <HiPaperClip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={ALLOWED_FILE_TYPES.join(',')}
          multiple
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
            rows={1}
            className="w-full px-4 py-2.5 theme-bg-input border theme-border-subtle rounded-xl
              theme-text placeholder:theme-text-muted resize-none focus:outline-none 
              focus:border-primary-500/50 input-glow transition-all text-sm
              max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
            id="message-input"
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={(!content.trim() && selectedFiles.length === 0) || sending}
          className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 
            text-white shadow-lg shadow-primary-500/20
            hover:from-primary-500 hover:to-primary-600 hover:shadow-primary-500/30
            disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
            transform hover:scale-105 active:scale-95 transition-all duration-200"
          id="send-message-btn"
        >
          <HiPaperAirplane className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
