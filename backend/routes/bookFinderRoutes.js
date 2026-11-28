import express from 'express';
import { getRecommendations, createLead, unsubscribeLead } from '../controllers/bookFinderController.js';
import { bookFinderLeadLimiter } from '../middleware/rateLimiter.js';

// Public Book Finder endpoints (no login needed)
const router = express.Router();

router.get('/recommendations', getRecommendations);
router.post('/leads', bookFinderLeadLimiter, createLead);
router.get('/unsubscribe', unsubscribeLead);

export default router;
