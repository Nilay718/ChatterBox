import { useState } from 'react';
import {
  HiEllipsisVertical,
  HiMagnifyingGlass,
  HiChevronLeft,
  HiInformationCircle,
} from 'react-icons/hi2';
import Avatar from '../common/Avatar';
import GroupInfoDrawer from '../group/GroupInfoDrawer';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import {
  getChatName,
  getChatAvatar,
  getChatPartner,
  formatLastSeen,
} from '../../utils/helpers';

const ChatHeader = ({ chat, onContactInfoToggle }) => {
  const { user } = useAuth();
  const { setSelectedChat, typingUsers } = useChat();
  const { isUserOnline } = useSocket();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const chatName = getChatName(chat, user?._id);
  const chatAvatar = getChatAvatar(chat, user?._id);
  const partner = !chat.isGroupChat ? getChatPartner(chat, user?._id) : null;
  const isOnline = partner ? isUserOnline(partner._id) : false;

  // Typing indicator text
  const chatTypers = typingUsers[chat._id] || [];
  const getStatusText = () => {
    if (chatTypers.length > 0) {
      const names = chatTypers.map((t) => t.name).join(', ');
      return `${names} ${chatTypers.length > 1 ? 'are' : 'is'} typing...`;
    }

    if (chat.isGroupChat) {
      return `${chat.participants?.length} members`;
    }

    if (isOnline) return 'Online';
    if (partner?.lastSeen) return `Last seen ${formatLastSeen(partner.lastSeen)}`;
    return 'Offline';
  };

  const statusText = getStatusText();
  const isTyping = chatTypers.length > 0;

  const handleAvatarClick = () => {
    if (chat.isGroupChat) {
      setShowGroupInfo(true);
    } else if (onContactInfoToggle) {
      onContactInfoToggle();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 theme-bg-secondary
        backdrop-blur-sm border-b theme-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button on mobile */}
          <button
            onClick={() => setSelectedChat(null)}
            className="lg:hidden p-1.5 -ml-1 rounded-lg theme-bg-hover theme-text-muted 
              transition-colors"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleAvatarClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={chatAvatar}
              name={chatName}
              size="md"
              isOnline={isOnline}
              showStatus={!chat.isGroupChat}
            />
            <div>
              <h2 className="font-semibold theme-text text-sm">{chatName}</h2>
              <p
                className={`text-xs transition-colors ${
                  isTyping
                    ? 'text-accent-400 font-medium'
                    : isOnline
                    ? 'text-accent-400'
                    : 'theme-text-muted'
                }`}
              >
                {statusText}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Contact / Group info button */}
          <button
            id="contact-info-btn"
            onClick={handleAvatarClick}
            className="p-2 rounded-lg theme-bg-hover theme-text-muted transition-colors"
            title={chat.isGroupChat ? 'Group info' : 'Contact info'}
          >
            <HiInformationCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group Info Drawer */}
      {chat.isGroupChat && (
        <GroupInfoDrawer
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          chat={chat}
        />
      )}
    </>
  );
};

export default ChatHeader;
