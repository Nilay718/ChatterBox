import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

/**
 * Format a date for the chat sidebar (Today, Yesterday, or date).
 */
export const formatChatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MM/dd/yyyy');
};

/**
 * Format a date for message timestamps.
 */
export const formatMessageTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'h:mm a');
};

/**
 * Format "last seen" as a relative time string.
 */
export const formatLastSeen = (date) => {
  if (!date) return 'a while ago';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Format message date separators (Today, Yesterday, or full date).
 */
export const formatDateSeparator = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

/**
 * Check if two dates are on different days (for date separators).
 */
export const isDifferentDay = (date1, date2) => {
  if (!date1 || !date2) return true;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
};

/**
 * Get the other participant in a 1-on-1 chat.
 */
export const getChatPartner = (chat, currentUserId) => {
  if (!chat || !chat.participants) return null;
  return chat.participants.find((p) => p._id !== currentUserId);
};

/**
 * Get the display name for a chat.
 */
export const getChatName = (chat, currentUserId) => {
  if (chat.isGroupChat) return chat.chatName;
  const partner = getChatPartner(chat, currentUserId);
  return partner?.name || 'Unknown';
};

/**
 * Get the avatar for a chat.
 */
export const getChatAvatar = (chat, currentUserId) => {
  if (chat.isGroupChat) return chat.groupAvatar || '';
  const partner = getChatPartner(chat, currentUserId);
  return partner?.avatar || '';
};

/**
 * Generate initials from a name (for avatar fallback).
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Format file size to human-readable string.
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Truncate text to a maximum length.
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
