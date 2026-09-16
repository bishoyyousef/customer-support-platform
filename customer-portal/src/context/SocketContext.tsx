import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { isDemoMode } from '../services/dataService';
import { demoEventEmitter } from '../services/demoEventEmitter';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinTicket: (ticketId: string) => void;
  leaveTicket: (ticketId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinTicket: () => {},
  leaveTicket: () => {},
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    if (isDemoMode) {
      // In Demo Mode, simulate connected socket state without network requests
      setIsConnected(true);

      // Create a mock socket object that delegates on/emit to demoEventEmitter
      const mockListeners: { [evt: string]: ((data: any) => void)[] } = {};

      const mockSocket = {
        on: (event: string, callback: (data: any) => void) => {
          if (!mockListeners[event]) mockListeners[event] = [];
          mockListeners[event].push(callback);

          const handler = (data: any) => callback(data);
          demoEventEmitter.on(event, handler);
        },
        off: (event: string, callback?: (data: any) => void) => {
          if (callback && mockListeners[event]) {
            mockListeners[event] = mockListeners[event].filter(cb => cb !== callback);
            demoEventEmitter.off(event, callback);
          }
        },
        emit: (event: string, ...args: any[]) => {
          demoEventEmitter.emit(event, args[0]);
        },
        disconnect: () => {
          setIsConnected(false);
        }
      } as unknown as Socket;

      setSocket(mockSocket);

      return () => {
        setIsConnected(false);
        setSocket(null);
      };
    }

    // Real API Mode: Connect to Socket.IO backend
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, isAuthenticated]);

  const joinTicket = (ticketId: string) => {
    if (socket && ticketId) {
      socket.emit('join_ticket', ticketId);
    }
  };

  const leaveTicket = (ticketId: string) => {
    if (socket && ticketId) {
      socket.emit('leave_ticket', ticketId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinTicket, leaveTicket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
