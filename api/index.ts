import express from 'express';
import { apiRouter } from '../src/api-router.js';

const app = express();
app.use(express.json());

// Enable CORS for Vercel deployments
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Mount the unified job scraping API router
app.use(apiRouter);

export default app;
