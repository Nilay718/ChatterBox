import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: [{ userId, name }] }
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });
  const [replyingTo, setReplyingTo] = useState(null); // Message being replied to

  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  // Fetch Chats
  const fetchChats = useCallback(async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const { data } = await api.get('/chats');
      setChats(data.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoadingChats(false);
    }
  }, [user]);

  // Fetch chats on mount
  useEffect(() => {
    if (user) fetchChats();
  }, [user, fetchChats]);

  // Fetch Messages
  const fetchMessages = useCallback(
    async (chatId, page = 1) => {
      if (!chatId) return;
      setLoadingMessages(true);
      try {
        const { data } = await api.get(`/messages/${chatId}`, {
          params: { page, limit: 50 },
        });
        if (page === 1) {
          setMessages(data.data);
        } else {
          // Prepend older messages for infinite scroll
          setMessages((prev) => [...data.data, ...prev]);
        }
        setPagination({
          page: data.pagination.page,
          hasMore: data.pagination.hasMore,
        });
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  // Load older messages (for infinite scroll)
  const loadMoreMessages = useCallback(() => {
    if (!selectedChat || !pagination.hasMore || loadingMessages) return;
    fetchMessages(selectedChat._id, pagination.page + 1);
  }, [selectedChat, pagination, loadingMessages, fetchMessages]);

  // Send Message
  const sendMessage = useCallback(
    async (chatId, content, messageType = 'text', file = null, replyTo = null) => {
      try {
        let response;

        if (file) {
          const formData = new FormData();
          formData.append('chatId', chatId);
          formData.append('content', content || '');
          formData.append('messageType', messageType);
          formData.append('file', file);
          if (replyTo) formData.append('replyTo', replyTo);

          response = await api.post('/messages', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          response = await api.post('/messages', {
            chatId,
            content,
            messageType,
            replyTo,
          });
        }

        const newMessage = response.data.data;

        // Add to local messages
        setMessages((prev) => [...prev, newMessage]);

        // Emit via socket for real-time delivery
        if (socket) {
          socket.emit('send_message', {
            message: newMessage,
            chatId,
          });
        }

        // Update chat list (move this chat to top)
        setChats((prev) =>
          prev
            .map((chat) =>
              chat._id === chatId
                ? { ...chat, latestMessage: newMessage, updatedAt: new Date() }
                : chat
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );

        return newMessage;
      } catch (error) {
        toast.error('Failed to send message');
        throw error;
      }
    },
    [socket]
  );

  // Edit Message
  const editMessage = useCallback(
    async (messageId, content) => {
      try {
        const { data } = await api.put(`/messages/${messageId}`, { content });
        const updatedMessage = data.data;

        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? updatedMessage : msg))
        );

        // Notify via socket
        if (socket && selectedChat) {
          socket.emit('message_edited', {
            chatId: selectedChat._id,
            messageId,
            content,
          });
        }

        return updatedMessage;
      } catch (error) {
        toast.error('Failed to edit message');
        throw error;
      }
    },
    [socket, selectedChat]
  );

  // Delete Message
  const deleteMessage = useCallback(
    async (messageId) => {
      try {
        await api.delete(`/messages/${messageId}`);

        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, isDeleted: true, content: 'This message was deleted' }
              : msg
          )
        );

        // Notify via socket
        if (socket && selectedChat) {
          socket.emit('message_deleted', {
            chatId: selectedChat._id,
            messageId,
          });
        }
      } catch (error) {
        toast.error('Failed to delete message');
      }
    },
    [socket, selectedChat]
  );

  // Mark Read
  const markAsRead = useCallback(
    (chatId) => {
      if (!socket || !chatId) return;
      socket.emit('mark_read', { chatId });

      // Reset local unread count
      setChats((prev) =>
        prev.map((chat) => {
          if (chat._id === chatId && user) {
            const updated = { ...chat };
            if (updated.unreadCounts) {
              const counts = { ...(updated.unreadCounts instanceof Map
                ? Object.fromEntries(updated.unreadCounts)
                : updated.unreadCounts) };
              counts[user._id] = 0;
              updated.unreadCounts = counts;
            }
            return updated;
          }
          return chat;
        })
      );

      // Clear notifications for this chat
      setNotifications((prev) => prev.filter((n) => n.chatId !== chatId));
    },
    [socket, user]
  );

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Helper: append message to state with deduplication
    const appendMessage = (message, chatId) => {
      if (selectedChatRef.current?._id === chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      // Update chat list — check if the chat already exists
      setChats((prev) => {
        const chatExists = prev.some((chat) => chat._id === chatId);
        if (!chatExists) {
          // Chat not in our list yet (first message from this user)
          // We'll trigger a full refetch below
          return prev;
        }
        return prev
          .map((chat) =>
            chat._id === chatId
              ? { ...chat, latestMessage: message, updatedAt: new Date() }
              : chat
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    // New message received (from chat room)
    const handleNewMessage = ({ message, chatId }) => {
      appendMessage(message, chatId);
    };

    // Notification received (from personal room — always fires)
    const handleNotification = ({ chatId, message, sender }) => {
      // If viewing this chat: just ensure the message is in state (handles room-join race)
      if (selectedChatRef.current?._id === chatId) {
        appendMessage(message, chatId);
        return;
      }

      // Not viewing this chat: show notification + update unread
      setNotifications((prev) => [
        ...prev,
        { chatId, message, sender, timestamp: new Date() },
      ]);

      // Check if this chat already exists in our list
      setChats((prevChats) => {
        const chatExists = prevChats.some((chat) => chat._id === chatId);
        if (!chatExists) {
          // NEW chat that we don't have yet — fetch full chat list from server
          fetchChats();
          return prevChats;
        }
        // Chat exists — update it in place
        return prevChats
          .map((chat) => {
            if (chat._id === chatId) {
              const updated = { ...chat, latestMessage: message, updatedAt: new Date() };
              if (user) {
                const counts = { ...(updated.unreadCounts instanceof Map
                  ? Object.fromEntries(updated.unreadCounts)
                  : updated.unreadCounts || {}) };
                counts[user._id] = (counts[user._id] || 0) + 1;
                updated.unreadCounts = counts;
              }
              return updated;
            }
            return chat;
          })
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });

      // Show toast notification
      toast(
        `${sender?.name || 'Someone'}: ${message?.content?.substring(0, 50) || 'Sent a file'}`,
        {
          icon: '💬',
          duration: 4000,
        }
      );
    };

    // Chat list update
    const handleChatUpdated = ({ chatId, latestMessage }) => {
      setChats((prev) =>
        prev
          .map((chat) =>
            chat._id === chatId
              ? { ...chat, latestMessage, updatedAt: new Date() }
              : chat
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };

    // Read receipts
    const handleMessagesRead = ({ chatId, userId: readerId }) => {
      if (selectedChatRef.current?._id === chatId) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            readBy: msg.readBy?.some?.((r) => (r._id || r) === readerId)
              ? msg.readBy
              : [...(msg.readBy || []), { _id: readerId }],
          }))
        );
      }
    };

    // Typing indicators
    const handleTyping = ({ chatId, userId: typerId, name }) => {
      setTypingUsers((prev) => {
        const chatTypers = prev[chatId] || [];
        if (chatTypers.some((t) => t.userId === typerId)) return prev;
        return { ...prev, [chatId]: [...chatTypers, { userId: typerId, name }] };
      });
    };

    const handleStopTyping = ({ chatId, userId: typerId }) => {
      setTypingUsers((prev) => {
        const chatTypers = (prev[chatId] || []).filter(
          (t) => t.userId !== typerId
        );
        if (chatTypers.length === 0) {
          const { [chatId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [chatId]: chatTypers };
      });
    };

    // Message edited
    const handleMessageEdited = ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, content, isEdited: true } : msg
        )
      );
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
            : msg
        )
      );
    };

    // Message reaction updated
    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    // Group updates
    const handleGroupUpdated = ({ chatId, updates }) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat._id === chatId ? { ...chat, ...updates } : chat
        )
      );
      // Refresh chats to get updated data
      fetchChats();
    };

    // Added to a new group
    const handleAddedToGroup = () => {
      fetchChats();
      toast.success('You were added to a group!');
    };

    // Removed from a group
    const handleRemovedFromGroup = ({ chatId }) => {
      setChats((prev) => prev.filter((chat) => chat._id !== chatId));
      if (selectedChatRef.current?._id === chatId) {
        setSelectedChat(null);
        toast('You were removed from the group', { icon: '👋' });
      }
    };

    // Register all listeners
    socket.on('new_message', handleNewMessage);
    socket.on('notification', handleNotification);
    socket.on('chat_updated', handleChatUpdated);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('added_to_group', handleAddedToGroup);
    socket.on('removed_from_group', handleRemovedFromGroup);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('notification', handleNotification);
      socket.off('chat_updated', handleChatUpdated);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('added_to_group', handleAddedToGroup);
      socket.off('removed_from_group', handleRemovedFromGroup);
    };
  }, [socket, user, fetchChats]);

  // Select Chat
  const selectChat = useCallback(
    (chat) => {
      // Leave previous chat room
      if (selectedChat && socket) {
        socket.emit('leave_chat', selectedChat._id);
      }

      setSelectedChat(chat);
      setMessages([]);
      setPagination({ page: 1, hasMore: false });

      if (chat && socket) {
        // Join new chat room
        socket.emit('join_chat', chat._id);
        // Fetch messages
        fetchMessages(chat._id, 1);
        // Mark as read
        markAsRead(chat._id);
      }
    },
    [selectedChat, socket, fetchMessages, markAsRead]
  );

  // Create Chat
  const accessOrCreateChat = useCallback(
    async (userId) => {
      try {
        const { data } = await api.post('/chats', { userId });
        const chat = data.data;

        // Add to chats list if not already there
        setChats((prev) => {
          const exists = prev.some((c) => c._id === chat._id);
          if (exists) return prev;
          return [chat, ...prev];
        });

        selectChat(chat);
        return chat;
      } catch (error) {
        toast.error('Failed to start chat');
        throw error;
      }
    },
    [selectChat]
  );

  // Create Group
  const createGroup = useCallback(
    async (name, participantIds) => {
      try {
        const { data } = await api.post('/chats/group', {
          name,
          participants: participantIds,
        });
        const groupChat = data.data;

        setChats((prev) => [groupChat, ...prev]);
        selectChat(groupChat);
        toast.success(`Group "${name}" created!`);
        return groupChat;
      } catch (error) {
        toast.error('Failed to create group');
        throw error;
      }
    },
    [selectChat]
  );

  // Toggle Reaction
  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      try {
        const { data } = await api.post(`/messages/${messageId}/react`, { emoji });
        const reactions = data.data;

        // Update local message state
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, reactions } : msg
          )
        );

        // Broadcast via socket for real-time sync
        if (socket && selectedChat) {
          socket.emit('message_reaction', {
            chatId: selectedChat._id,
            messageId,
            reactions,
          });
        }
      } catch (error) {
        console.error('Failed to toggle reaction:', error);
      }
    },
    [socket, selectedChat]
  );

  const value = {
    chats,
    selectedChat,
    messages,
    loadingChats,
    loadingMessages,
    notifications,
    typingUsers,
    pagination,
    replyingTo,
    fetchChats,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    selectChat,
    setSelectedChat,
    setReplyingTo,
    accessOrCreateChat,
    createGroup,
    markAsRead,
    setNotifications,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
