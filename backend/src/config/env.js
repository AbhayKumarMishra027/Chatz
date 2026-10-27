import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.issues.map((issue) => issue.path.join('.')).join(', '));
  process.exit(1);
}

export const env = result.data;

export function validateRuntimeEnv() {
  const missing = [];
  if (!env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) missing.push('JWT_SECRET (at least 32 characters)');
  if (missing.length) {
    throw new Error(`Missing or invalid required environment variables: ${missing.join(', ')}. See backend/.env.example.`);
  }
}
