import express from 'express';
import cors from 'cors';
import departmentRoutes from './routes/departmentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', departmentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'talk2doc-backend', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] talk2doc backend running on port ${PORT}`);
});
