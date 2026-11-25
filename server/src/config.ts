import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
