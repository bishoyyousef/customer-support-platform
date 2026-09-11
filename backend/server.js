import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDb, checkConnection } from './database/connection.js';
import { initSocketServer } from './socket.js';

import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Top-level Middleware
app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:4200'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login requests per `window`
  message: { message: 'Too many login attempts, please try again after an hour' }
});
app.use('/api/auth', authLimiter);

// Process Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Dependency Readiness Endpoint
app.get('/api/ready', async (req, res) => {
  try {
    const isConnected = checkConnection();
    if (isConnected) {
      res.status(200).json({ status: 'ready', database: 'connected' });
    } else {
      res.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
  } catch (err) {
    res.status(503).json({ status: 'unavailable', database: 'error' });
  }
});

// Legacy Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Customer Support Platform Shared API Service (MongoDB Atlas)',
    docs: '/README.md'
  });
});

// Modular Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/users', userRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Attach Socket.io
initSocketServer(server);

export async function startServer() {
  try {
    await connectDb();
    server.listen(PORT, () => {
      console.log(`Persistent MongoDB Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
