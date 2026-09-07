import { Server } from 'socket.io';
import userRepository from './repositories/userRepository.js';

let ioInstance = null;

async function verifyToken(token) {
  if (!token) return null;
  let username = token;
  if (typeof token === 'string' && token.startsWith('mock-jwt-token-for-')) {
    username = token.replace('mock-jwt-token-for-', '');
  }
  const user = await userRepository.findByUsername(username);
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

export function initSocketServer(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  // Auth handshake middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }
      const user = await verifyToken(token);
      if (!user) {
        return next(new Error('Authentication error: Invalid token'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    socket.on('join_dashboard', () => {
      if (socket.user && (socket.user.role === 'agent' || socket.user.role === 'manager')) {
        socket.join('dashboard_updates');
      }
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function broadcastNewMessage(ticketId, message) {
  if (!ioInstance) return;

  if (message.isInternal) {
    const roomSockets = ioInstance.sockets.adapter.rooms.get(`ticket:${ticketId}`);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const clientSocket = ioInstance.sockets.sockets.get(socketId);
        if (clientSocket && clientSocket.user && (clientSocket.user.role === 'agent' || clientSocket.user.role === 'manager')) {
          clientSocket.emit('new_message', message);
        }
      }
    }
  } else {
    ioInstance.to(`ticket:${ticketId}`).emit('new_message', message);
  }
}

export function broadcastTicketUpdate(ticket) {
  if (!ioInstance) return;
  ioInstance.to(`ticket:${ticket.id}`).emit('ticket_updated', ticket);
  ioInstance.to('dashboard_updates').emit('ticket_updated', ticket);
}

export function broadcastNewTicket(ticket) {
  if (!ioInstance) return;
  ioInstance.to('dashboard_updates').emit('ticket_created', ticket);
}
