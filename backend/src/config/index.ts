import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT || 3020),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'focales-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5175',
  databaseUrl: process.env.DATABASE_URL || '',
};
