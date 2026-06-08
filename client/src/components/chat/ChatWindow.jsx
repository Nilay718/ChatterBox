import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatHeader from './ChatHeader';
import ScrollableChat from './ScrollableChat';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ContactInfoPanel from './ContactInfoPanel';
import { MessageListSkeleton } from '../common/Skeleton';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { motion } from 'framer-motion';
import { getChatPartner } from '../../utils/helpers';

const ChatWindow = () => {
  const { selectedChat, messages, loadingMessages, loadMoreMessages, pagination, typingUsers } =
    useChat();
  const { user } = useAuth();
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Empty state when no chat is selected
  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center theme-bg p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-700/20 
            flex items-center justify-center">
            <HiChatBubbleLeftRight className="w-12 h-12 text-primary-400" />
          </div>

          <h2 className="text-2xl font-bold gradient-text mb-3">
            Welcome to ChatterBox
          </h2>
          <p className="theme-text-tertiary leading-relaxed">
            Select a conversation from the sidebar or start a new chat.
            Your messages are delivered in real-time with end-to-end
            reliability.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: '💬', label: 'Real-time Chat' },
              { emoji: '👥', label: 'Group Messages' },
              { emoji: '📎', label: 'File Sharing' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="p-3 rounded-xl theme-bg-secondary border theme-border-subtle"
              >
                <span className="text-2xl">{feature.emoji}</span>
                <p className="text-xs theme-text-muted mt-1">{feature.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const chatTypers = typingUsers[selectedChat._id] || [];
  const partner = !selectedChat.isGroupChat
    ? getChatPartner(selectedChat, user?._id)
    : null;

  return (
    <div className="flex-1 flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full theme-bg min-w-0">
        {/* Chat Header */}
        <ChatHeader
          chat={selectedChat}
          onContactInfoToggle={() => setShowContactInfo((prev) => !prev)}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden relative">
          {loadingMessages && messages.length === 0 ? (
            <MessageListSkeleton />
          ) : (
            <ScrollableChat
              messages={messages}
              currentUserId={user?._id}
              hasMore={pagination.hasMore}
              loadMore={loadMoreMessages}
              isLoadingMore={loadingMessages}
            />
          )}

          {/* Typing Indicator overlay */}
          {chatTypers.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
              <TypingIndicator users={chatTypers} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <MessageInput chatId={selectedChat._id} />
      </div>

      {/* Contact Info Panel (for 1-on-1 chats) */}
      {!selectedChat.isGroupChat && partner && (
        <ContactInfoPanel
          isOpen={showContactInfo}
          onClose={() => setShowContactInfo(false)}
          user={partner}
        />
      )}
    </div>
  );
};

export default ChatWindow;
