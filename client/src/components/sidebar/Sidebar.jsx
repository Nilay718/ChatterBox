import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMagnifyingGlass,
  HiUserGroup,
  HiArrowRightOnRectangle,
  HiSun,
  HiMoon,
  HiPencilSquare,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import ChatListItem from './ChatListItem';
import SearchBar from './SearchBar';
import UserSearchModal from './UserSearchModal';
import CreateGroupModal from '../group/CreateGroupModal';
import ProfileModal from './ProfileModal';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { ChatListSkeleton } from '../common/Skeleton';

const Sidebar = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const { chats, loadingChats, selectedChat, selectChat, notifications } = useChat();
  const { isConnected } = useSocket();
  const { isDark, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Filter chats by search query
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (chat.isGroupChat) {
      return chat.chatName?.toLowerCase().includes(query);
    }
    return chat.participants?.some(
      (p) => p._id !== user?._id && p.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div
      className={`flex flex-col h-full theme-bg-secondary border-r theme-border-subtle ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b theme-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Clickable avatar — opens profile */}
            <button
              onClick={() => setShowProfile(true)}
              className="relative group"
              title="Edit profile"
            >
              <Avatar
                src={user?.avatar}
                name={user?.name}
                size="md"
                isOnline={isConnected}
                showStatus
              />
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 
                transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <HiPencilSquare className="w-4 h-4 text-white" />
              </div>
            </button>
            <div>
              <h1 className="text-base font-bold theme-text truncate max-w-[140px]">
                {user?.name || 'ChatterBox'}
              </h1>
              <p className="text-xs theme-text-muted">
                {isConnected ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent-400 rounded-full" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    Connecting...
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg theme-bg-hover theme-text-muted hover:text-primary-500 transition-colors"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
            </button>

            {/* New chat */}
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 rounded-lg theme-bg-hover theme-text-muted hover:text-primary-500 transition-colors"
              title="New chat"
              id="new-chat-btn"
            >
              <HiPencilSquare className="w-5 h-5" />
            </button>

            {/* Create group */}
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 rounded-lg theme-bg-hover theme-text-muted hover:text-primary-500 transition-colors"
              title="Create group"
              id="create-group-btn"
            >
              <HiUserGroup className="w-5 h-5" />
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-500/10 theme-text-muted hover:text-red-400 transition-colors"
              title="Logout"
              id="logout-btn"
            >
              <HiArrowRightOnRectangle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loadingChats ? (
          <ChatListSkeleton />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 mb-4 rounded-full theme-bg-tertiary flex items-center justify-center">
              <HiMagnifyingGlass className="w-8 h-8 theme-text-muted" />
            </div>
            <p className="theme-text-tertiary font-medium">
              {searchQuery ? 'No chats found' : 'No conversations yet'}
            </p>
            <p className="theme-text-muted text-sm mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Start chatting by clicking the pencil icon'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredChats.map((chat, index) => (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <ChatListItem
                  chat={chat}
                  isSelected={selectedChat?._id === chat._id}
                  onClick={() => selectChat(chat)}
                  currentUserId={user?._id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
      />
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
};

export default Sidebar;
