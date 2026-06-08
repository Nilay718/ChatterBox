import { useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Custom hook for common socket operations.
 * Provides typed emit/listen helpers.
 */
export const useSocketEvents = () => {
  const { socket, isConnected } = useSocket();

  const emit = useCallback(
    (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      }
    },
    [socket, isConnected]
  );

  const on = useCallback(
    (event, handler) => {
      if (socket) {
        socket.on(event, handler);
        return () => socket.off(event, handler);
      }
      return () => {};
    },
    [socket]
  );

  return { emit, on, socket, isConnected };
};

export default useSocketEvents;
