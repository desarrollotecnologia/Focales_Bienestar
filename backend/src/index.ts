import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import catalogosRoutes from './routes/catalogos.routes';
import ciclosRoutes from './routes/ciclos.routes';
import hallazgosRoutes from './routes/hallazgos.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'focales-bienestar',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/hallazgos', hallazgosRoutes);
app.use('/api/dashboard', dashboardRoutes);

if (config.nodeEnv === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Focales Bienestar API en http://localhost:${config.port}`);
});

export default app;
