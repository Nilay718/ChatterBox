import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../utils/constants';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    // ==================== Connection Events ====================
    newSocket.on('connect', () => {
      setIsConnected(true);
      // Join personal room
      newSocket.emit('setup', user._id);
    });

    // When server confirms setup with the list of online users, seed the set
    newSocket.on('initial_online_users', (userIds) => {
      if (Array.isArray(userIds)) {
        setOnlineUsers(new Set(userIds));
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us — try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      if (error.message.includes('Authentication')) {
        toast.error('Session expired. Please log in again.');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      toast.success('Reconnected!');
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      if (attemptNumber === 1) {
        toast.loading('Reconnecting...', { id: 'reconnect' });
      }
    });

    newSocket.on('reconnect_failed', () => {
      toast.error('Connection lost. Please refresh the page.', {
        id: 'reconnect',
      });
    });

    // ==================== Presence Events ====================
    newSocket.on('user_online', ({ userId: onlineUserId }) => {
      setOnlineUsers((prev) => new Set([...prev, onlineUserId]));
    });

    newSocket.on('user_offline', ({ userId: offlineUserId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(offlineUserId);
        return next;
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  /**
   * Check if a specific user is online.
   */
  const isUserOnline = useCallback(
    (userId) => onlineUsers.has(userId),
    [onlineUsers]
  );

  const value = {
    socket,
    isConnected,
    onlineUsers,
    isUserOnline,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
