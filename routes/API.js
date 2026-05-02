const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  getFounderStats,
  getFounderByWallet,
  registerFounder
} = require('../services/founderService');

const {
  getSubscriptionByWallet
} = require('../services/subscriptionService');

const {
  createPremiumCheckoutSession,
  createBillingPortalSession
} = require('../services/stripeService');

const {
  getAccessState
} = require('../services/accessService');

const {
  runScoutAgent
} = require('../services/agentService');

const {
  isValidWalletAddress,
  validateScoutPrompt
} = require('../lib/validators');

const {
  verifyWalletSignature
} = require('../services/authService');

const {
  createAuthNonce
} = require('../services/nonceService');

const {
  getAdminStats
} = require('../services/adminService');

const founderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many founder requests, please try again later.' }
});

const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many billing requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' }
});

router.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'bot-empire-api'
  });
});

router.post('/auth/nonce', authLimiter, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = await createAuthNonce(walletAddress);
    res.json(result);
  } catch (error) {
    console.error('Auth nonce route error:', error.message);
    res.status(500).json({ error: 'Failed to create auth nonce' });
  }
});

router.get('/founders/stats', async (req, res) => {
  try {
    const stats = await getFounderStats();
    res.json(stats);
  } catch (error) {
    console.error('Founder stats route error:', error.message);
    res.status(500).json({ error: 'Failed to load founder stats' });
  }
});

router.get('/founders/:wallet', async (req, res) => {
  try {
    if (!isValidWalletAddress(req.params.wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const founder = await getFounderByWallet(req.params.wallet);

    if (!founder) {
      return res.status(404).json({ error: 'Founder record not found' });
    }

    res.json(founder);
  } catch (error) {
    console.error('Founder lookup route error:', error.message);
    res.status(500).json({ error: 'Failed to load founder record' });
  }
});

router.post('/founders/register', founderLimiter, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const isValid = await verifyWalletSignature({ walletAddress, signature });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    const founder = await registerFounder(walletAddress);
    res.json(founder);
  } catch (error) {
    console.error('Founder register route error:', error.message);
    res.status(500).json({ error: 'Failed to register founder' });
  }
});

router.get('/billing/subscription/:wallet', async (req, res) => {
  try {
    if (!isValidWalletAddress(req.params.wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const subscription = await getSubscriptionByWallet(req.params.wallet);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Subscription lookup route error:', error.message);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

router.post('/billing/create-checkout-session', billingLimiter, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const isValid = await verifyWalletSignature({ walletAddress, signature });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    const session = await createPremiumCheckoutSession({ walletAddress });

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Stripe checkout route error:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/billing/create-portal-session', billingLimiter, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const isValid = await verifyWalletSignature({ walletAddress, signature });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    const subscription = await getSubscriptionByWallet(walletAddress);

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({ error: 'Active billing customer not found' });
    }

    const session = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId
    });

    res.json({
      portalUrl: session.url
    });
  } catch (error) {
    console.error('Billing portal route error:', error.message);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

router.get('/access/:wallet', async (req, res) => {
  try {
    if (!isValidWalletAddress(req.params.wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const accessState = await getAccessState(req.params.wallet);
    res.json(accessState);
  } catch (error) {
    console.error('Access state route error:', error.message);
    res.status(500).json({ error: 'Failed to load access state' });
  }
});

router.post('/agents/scout', aiLimiter, async (req, res) => {
  try {
    const { walletAddress, signature, prompt } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    if (!isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const isValid = await verifyWalletSignature({ walletAddress, signature });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    const promptError = validateScoutPrompt(prompt);
    if (promptError) {
      return res.status(400).json({ error: promptError });
    }

    const result = await runScoutAgent({
      walletAddress,
      prompt
    });

    res.json(result);
  } catch (error) {
    console.error('Scout agent route error:', error.message);
    res.status(500).json({ error: 'Failed to run scout agent' });
  }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const { walletAddress, signature } = req.query; // Wallet signature verification

    if (!await verifyWalletSignature({ walletAddress, signature })) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }

    // Allow only authorized admins
    if (!await isAuthorizedAdmin(walletAddress)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await getAdminStats(walletAddress);
    res.json(stats);
  } catch (error) {
    console.error('Admin stats route error:', error.message);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

module.exports = router;
