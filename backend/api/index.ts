// Vercel Serverless Function Handler
// This file re-exports the Express app for Vercel's serverless runtime.
// Vercel automatically detects files in /api and treats them as serverless functions.
import app from '../src/index';

export default app;
