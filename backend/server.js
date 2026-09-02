import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDb } from './database/connection.js';

import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Top-level Middleware
app.use(cors());
app.use(bodyParser.json());

// Health Check Endpoint
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

export async function startServer() {
  try {
    await connectDb();
    app.listen(PORT, () => {
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
