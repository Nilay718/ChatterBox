import { useRef, useEffect, useMemo } from 'react';
import MessageBubble from './MessageBubble';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { isDifferentDay, formatDateSeparator } from '../../utils/helpers';

/**
 * Scrollable message list with infinite scroll for pagination.
 * Auto-scrolls to bottom on new messages.
 * Shows date separators between different days.
 */
const ScrollableChat = ({
  messages,
  currentUserId,
  hasMore,
  loadMore,
  isLoadingMore,
}) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  // Infinite scroll sentinel (for loading older messages at top)
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isLoadingMore);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const wasAtBottom =
      prevMessagesLengthRef.current === 0 ||
      messages.length - prevMessagesLengthRef.current === 1;

    if (isNewMessage && wasAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && prevMessagesLengthRef.current <= 1) {
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  // Determine which messages should show avatar (first of a sequence from same sender)
  const messagesWithMeta = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const showAvatar =
        !prevMsg ||
        prevMsg.sender?._id !== msg.sender?._id ||
        isDifferentDay(prevMsg.createdAt, msg.createdAt) ||
        prevMsg.messageType === 'system';

      const showDateSeparator =
        !prevMsg || isDifferentDay(prevMsg.createdAt, msg.createdAt);

      return { msg, showAvatar, showDateSeparator };
    });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto py-4"
      id="message-container"
    >
      {/* Infinite scroll sentinel — loading older messages */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {messagesWithMeta.map(({ msg, showAvatar, showDateSeparator }) => (
        <div key={msg._id}>
          {/* Date separator */}
          {showDateSeparator && (
            <div className="flex items-center justify-center my-4 px-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              <span className="px-3 py-1 text-xs theme-text-muted theme-bg-secondary rounded-full mx-2">
                {formatDateSeparator(msg.createdAt)}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </div>
          )}

          <MessageBubble
            message={msg}
            isOwn={msg.sender?._id === currentUserId}
            showAvatar={showAvatar}
          />
        </div>
      ))}

      {/* Empty state */}
      {messages.length === 0 && !isLoadingMore && (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <p className="theme-text-muted text-lg">💬</p>
          <p className="theme-text-tertiary mt-2">No messages yet</p>
          <p className="theme-text-muted text-sm">Send the first message!</p>
        </div>
      )}

      {/* Bottom anchor for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
};

export default ScrollableChat;
