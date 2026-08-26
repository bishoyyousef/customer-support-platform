const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDb } = require('./database/connection');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const managerRoutes = require('./routes/managerRoutes');
const { errorHandler } = require('./middleware/errorHandler');

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

// Global Error Handler Middleware
app.use(errorHandler);

async function startServer() {
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

if (require.main === module) {
  startServer();
}

module.exports = app;
