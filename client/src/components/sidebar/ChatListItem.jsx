import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import {
  getChatName,
  getChatAvatar,
  getChatPartner,
  formatChatDate,
  truncate,
} from '../../utils/helpers';

const ChatListItem = ({ chat, isSelected, onClick, currentUserId }) => {
  const { isUserOnline } = useSocket();
  const { typingUsers } = useChat();

  const chatName = getChatName(chat, currentUserId);
  const chatAvatar = getChatAvatar(chat, currentUserId);
  const partner = !chat.isGroupChat ? getChatPartner(chat, currentUserId) : null;
  const isOnline = partner ? isUserOnline(partner._id) : false;

  // Get unread count for current user
  const unreadCount = chat.unreadCounts
    ? (chat.unreadCounts instanceof Map
        ? chat.unreadCounts.get(currentUserId)
        : chat.unreadCounts[currentUserId]) || 0
    : 0;

  // Check if someone is typing in this chat
  const chatTypers = typingUsers[chat._id] || [];
  const isTyping = chatTypers.length > 0;

  // Format latest message preview
  const getMessagePreview = () => {
    if (isTyping) {
      const typerNames = chatTypers.map((t) => t.name).join(', ');
      return `${typerNames} ${chatTypers.length > 1 ? 'are' : 'is'} typing...`;
    }

    const msg = chat.latestMessage;
    if (!msg) return 'No messages yet';

    if (msg.isDeleted) return '🚫 This message was deleted';

    const prefix =
      msg.sender?._id === currentUserId
        ? 'You: '
        : chat.isGroupChat
        ? `${msg.sender?.name?.split(' ')[0]}: `
        : '';

    switch (msg.messageType) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'file':
        return `${prefix}📎 ${msg.fileName || 'File'}`;
      case 'system':
        return msg.content;
      default:
        return `${prefix}${truncate(msg.content, 40)}`;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
        theme-bg-hover
        ${isSelected
          ? 'theme-bg-selected border-r-2 border-primary-500'
          : 'border-r-2 border-transparent'
        }`}
      id={`chat-item-${chat._id}`}
    >
      <Avatar
        src={chatAvatar}
        name={chatName}
        size="md"
        isOnline={isOnline}
        showStatus={!chat.isGroupChat}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3
            className={`font-semibold truncate text-sm ${
              isSelected ? 'text-primary-500' : 'theme-text'
            }`}
          >
            {chatName}
            {chat.isGroupChat && (
              <span className="ml-1.5 text-xs theme-text-muted">
                ({chat.participants?.length})
              </span>
            )}
          </h3>
          <span className="text-xs theme-text-muted shrink-0 ml-2">
            {formatChatDate(chat.latestMessage?.createdAt || chat.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p
            className={`text-xs truncate ${
              isTyping
                ? 'text-accent-400 font-medium'
                : unreadCount > 0
                ? 'theme-text-secondary font-medium'
                : 'theme-text-muted'
            }`}
          >
            {getMessagePreview()}
          </p>
          {unreadCount > 0 && <Badge count={unreadCount} className="ml-2 shrink-0" />}
        </div>
      </div>
    </button>
  );
};

export default ChatListItem;
