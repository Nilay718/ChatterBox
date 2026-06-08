import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  formatMessageTime,
  formatFileSize,
} from '../../utils/helpers';
import Avatar from '../common/Avatar';
import {
  HiCheck,
  HiPencil,
  HiTrash,
  HiDocumentArrowDown,
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiFaceSmile,
} from 'react-icons/hi2';
import { downloadBase64File } from '../../utils/fileHelpers';
import ImageLightbox from './ImageLightbox';

// Quick-pick emojis for the reaction bar
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble = ({ message, isOwn, showAvatar = true }) => {
  const { user } = useAuth();
  const { editMessage, deleteMessage, toggleReaction, setReplyingTo } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const editInputRef = useRef(null);
  const reactionRef = useRef(null);

  const isDeleted = message.isDeleted;
  const isSystem = message.messageType === 'system';

  // System messages (centered)
  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 text-xs theme-text-muted theme-bg-tertiary rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Read receipt logic
  const isRead = message.readBy?.length > 1;

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(message._id, editContent.trim());
      setIsEditing(false);
    } catch {
      setEditContent(message.content);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this message?')) {
      await deleteMessage(message._id);
    }
    setShowActions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const handleFileDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadBase64File(message.fileUrl, message.fileName || 'download');
  };

  const handleReply = () => {
    setReplyingTo(message);
    setShowActions(false);
  };

  const handleReaction = (emoji) => {
    toggleReaction(message._id, emoji);
    setShowReactionPicker(false);
    setShowActions(false);
  };

  const isVideoFile =
    message.fileUrl?.startsWith('data:video/') ||
    message.fileName?.match(/\.(mp4|webm|mov|avi)$/i) ||
    message.fileUrl?.match(/\.(mp4|webm|mov|avi)$/i);

  // Group reactions by emoji with count and user names
  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    const emoji = r.emoji;
    if (!acc[emoji]) {
      acc[emoji] = { emoji, count: 0, users: [], hasOwn: false };
    }
    acc[emoji].count++;
    acc[emoji].users.push(r.user?.name || 'User');
    if ((r.user?._id || r.user) === user?._id) {
      acc[emoji].hasOwn = true;
    }
    return acc;
  }, {});
  const reactionList = Object.values(groupedReactions);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5 group px-4`}
        onMouseEnter={() => !isDeleted && setShowActions(true)}
        onMouseLeave={() => {
          if (!showReactionPicker) {
            setShowActions(false);
          }
        }}
      >
        {/* Sender avatar (for received messages) */}
        {!isOwn && showAvatar && (
          <Avatar
            src={message.sender?.avatar}
            name={message.sender?.name}
            size="xs"
            className="mr-2 mt-auto mb-1 shrink-0"
          />
        )}
        {!isOwn && !showAvatar && <div className="w-7 mr-2 shrink-0" />}

        <div className={`max-w-[70%] relative ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name in group chats */}
          {!isOwn && showAvatar && (
            <p className="text-xs text-primary-400 font-medium mb-0.5 ml-1">
              {message.sender?.name}
            </p>
          )}

          {/* Message bubble */}
          <div
            className={`relative px-3.5 py-2 ${
              isOwn ? 'msg-sent' : 'msg-received'
            } ${isDeleted ? 'opacity-60 italic' : ''}`}
          >
            {/* Reply preview — what this message is replying to */}
            {message.replyTo && !isDeleted && (
              <div
                className="mb-2 p-2 rounded-lg border-l-3 border-primary-400/60 cursor-pointer
                  hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: isOwn
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(99,102,241,0.08)',
                  borderLeftWidth: '3px',
                }}
              >
                <span className="text-xs font-semibold text-primary-400 block">
                  {message.replyTo.sender?.name || 'User'}
                </span>
                <p className="text-xs opacity-70 truncate mt-0.5 max-w-[250px]">
                  {message.replyTo.messageType === 'image'
                    ? '📷 Photo'
                    : message.replyTo.messageType === 'file'
                      ? '📎 File'
                      : message.replyTo.content || 'Message'}
                </p>
              </div>
            )}

            {/* Image message */}
            {message.messageType === 'image' && message.fileUrl && !isDeleted && (
              <div className="mb-1.5 -mx-1 -mt-0.5 relative group/img">
                <img
                  src={message.fileUrl}
                  alt="Shared image"
                  className="rounded-lg max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                  onClick={() => setLightboxOpen(true)}
                />
                <button
                  onClick={handleFileDownload}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white 
                    opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/70"
                  title="Download"
                >
                  <HiArrowDownTray className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Video message */}
            {message.messageType === 'file' && message.fileUrl && !isDeleted && isVideoFile && (
              <div className="mb-1.5 -mx-1 -mt-0.5">
                <video
                  src={message.fileUrl}
                  controls
                  className="rounded-lg max-h-60 w-auto"
                  preload="metadata"
                />
              </div>
            )}

            {/* File message (non-video) */}
            {message.messageType === 'file' && message.fileUrl && !isDeleted && !isVideoFile && (
              <button
                onClick={handleFileDownload}
                className="flex items-center gap-2 p-2 mb-1 rounded-lg bg-black/10 
                  hover:bg-black/20 transition-colors w-full text-left"
              >
                <HiDocumentArrowDown className="w-8 h-8 text-primary-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {message.fileName || 'File'}
                  </p>
                  <p className="text-xs opacity-60">
                    {formatFileSize(message.fileSize)}
                  </p>
                </div>
                <HiArrowDownTray className="w-5 h-5 text-primary-400 shrink-0" />
              </button>
            )}

            {/* Text content */}
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleEdit}
                className="bg-transparent border-none outline-none w-full text-sm"
                autoFocus
              />
            ) : (
              message.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )
            )}

            {/* Timestamp & read receipts */}
            <div
              className={`flex items-center gap-1 mt-0.5 ${
                isOwn ? 'justify-end' : 'justify-start'
              }`}
            >
              <span className="text-[10px] opacity-50">
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && !isDeleted && (
                <span className="text-[10px] opacity-40">edited</span>
              )}
              {isOwn && !isDeleted && (
                <span className="ml-0.5">
                  {isRead ? (
                    <span className="text-blue-400">
                      <HiCheck className="w-3 h-3 inline" />
                      <HiCheck className="w-3 h-3 inline -ml-1.5" />
                    </span>
                  ) : (
                    <HiCheck className="w-3 h-3 inline opacity-50" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reaction display — WhatsApp style below bubble */}
          {reactionList.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {reactionList.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => handleReaction(r.emoji)}
                  title={r.users.join(', ')}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
                    border transition-all hover:scale-110 cursor-pointer
                    ${r.hasOwn
                      ? 'bg-primary-500/20 border-primary-400/40 shadow-sm'
                      : 'theme-bg-tertiary border-transparent hover:border-primary-400/30'
                    }`}
                >
                  <span className="text-sm">{r.emoji}</span>
                  {r.count > 1 && (
                    <span className="text-[10px] theme-text-muted font-medium">{r.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons (on hover) */}
          <AnimatePresence>
            {showActions && !isDeleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute -top-3 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-0.5 
                  theme-bg-tertiary rounded-lg border theme-border-subtle shadow-lg p-0.5 z-10`}
              >
                {/* Reply button */}
                <button
                  onClick={handleReply}
                  className="p-1.5 rounded theme-bg-hover theme-text-muted transition-colors"
                  title="Reply"
                >
                  <HiArrowUturnLeft className="w-3.5 h-3.5" />
                </button>

                {/* Reaction button */}
                <div className="relative" ref={reactionRef}>
                  <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className={`p-1.5 rounded transition-colors ${
                      showReactionPicker
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'theme-bg-hover theme-text-muted'
                    }`}
                    title="React"
                  >
                    <HiFaceSmile className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick reaction picker */}
                  <AnimatePresence>
                    {showReactionPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'}
                          flex items-center gap-0.5 p-1.5 rounded-xl theme-bg-secondary
                          border theme-border-subtle shadow-xl z-50`}
                        onMouseLeave={() => setShowReactionPicker(false)}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg
                              hover:bg-primary-500/20 hover:scale-125 transition-all text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Edit button (own messages only) */}
                {isOwn && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowActions(false);
                    }}
                    className="p-1.5 rounded theme-bg-hover theme-text-muted transition-colors"
                    title="Edit"
                  >
                    <HiPencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete button (own messages only) */}
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded hover:bg-red-500/10 theme-text-muted hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <HiTrash className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        imageUrl={message.fileUrl}
        fileName={message.fileName}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default MessageBubble;
