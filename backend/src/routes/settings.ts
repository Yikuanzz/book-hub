import { Router } from 'express';
import { z } from 'zod';
import { settingsRepo } from '../repositories/settingsRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const providerSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).default(2048),
});

router.get('/', asyncHandler(async (_req, res) => {
  const settings = settingsRepo.getAll();
  res.json({ success: true, data: settings });
}));

router.put('/', asyncHandler(async (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    throw new AppError(400, 'Invalid settings body');
  }
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.body)) {
    entries[key] = String(value);
  }
  settingsRepo.setMany(entries);
  res.json({ success: true, data: entries });
}));

router.get('/ai-providers', asyncHandler(async (_req, res) => {
  const providers = settingsRepo.findAllProviders();
  res.json({ success: true, data: providers });
}));

router.post('/ai-providers', asyncHandler(async (req, res) => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const provider = settingsRepo.createProvider(parsed.data);
  res.status(201).json({ success: true, data: provider });
}));

router.put('/ai-providers/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const parsed = providerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  settingsRepo.updateProvider(id, parsed.data);
  const providers = settingsRepo.findAllProviders();
  res.json({ success: true, data: providers.find(p => p.id === id) });
}));

router.delete('/ai-providers/:id', asyncHandler(async (req, res) => {
  settingsRepo.deleteProvider(req.params.id);
  res.json({ success: true });
}));

router.put('/ai-providers/:id/activate', asyncHandler(async (req, res) => {
  settingsRepo.activateProvider(req.params.id);
  res.json({ success: true });
}));

export default router;
