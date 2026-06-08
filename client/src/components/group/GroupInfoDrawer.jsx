import { motion, AnimatePresence } from 'framer-motion';
import {
  HiXMark,
  HiUserMinus,
  HiArrowRightOnRectangle,
  HiUserGroup,
} from 'react-icons/hi2';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useChat } from '../../context/ChatContext';

const GroupInfoDrawer = ({ isOpen, onClose, chat }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const { fetchChats, setSelectedChat } = useChat();

  const isAdmin = chat.groupAdmin?._id === user?._id;

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;

    try {
      await api.put(`/chats/group/${chat._id}/remove`, { userId: memberId });
      toast.success(`${memberName} removed from group`);
      fetchChats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await api.delete(`/chats/group/${chat._id}/leave`);
      toast.success('Left the group');
      setSelectedChat(null);
      fetchChats();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-dark-900 border-l border-dark-700/50 
              z-50 overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
              <h3 className="font-semibold text-dark-100">Group Info</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Group avatar and name */}
            <div className="flex flex-col items-center p-6 border-b border-dark-700/30">
              <Avatar
                src={chat.groupAvatar}
                name={chat.chatName}
                size="xl"
              />
              <h2 className="mt-3 text-lg font-bold text-dark-100">
                {chat.chatName}
              </h2>
              <p className="text-sm text-dark-500 flex items-center gap-1">
                <HiUserGroup className="w-4 h-4" />
                {chat.participants?.length} members
              </p>
            </div>

            {/* Members list */}
            <div className="p-4">
              <h4 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
                Members
              </h4>
              <div className="space-y-1">
                {chat.participants?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-dark-800/50 transition-colors"
                  >
                    <Avatar
                      src={member.avatar}
                      name={member.name}
                      size="sm"
                      isOnline={isUserOnline(member._id)}
                      showStatus
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-100 truncate">
                        {member.name}
                        {member._id === user?._id && (
                          <span className="text-dark-500 ml-1">(You)</span>
                        )}
                      </p>
                      {member._id === chat.groupAdmin?._id && (
                        <span className="text-xs text-primary-400 font-medium">
                          Admin
                        </span>
                      )}
                    </div>

                    {/* Remove button (admin only, not for self) */}
                    {isAdmin && member._id !== user?._id && (
                      <button
                        onClick={() => handleRemoveMember(member._id, member.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-500 
                          hover:text-red-400 transition-colors"
                        title="Remove from group"
                      >
                        <HiUserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave group */}
            <div className="p-4 border-t border-dark-700/30">
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  text-red-400 hover:bg-red-500/10 border border-red-500/20
                  transition-colors text-sm font-medium"
              >
                <HiArrowRightOnRectangle className="w-4 h-4" />
                Leave Group
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GroupInfoDrawer;
