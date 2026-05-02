const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPremiumCheckoutSession({ walletAddress }) {
  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error('Missing STRIPE_PRICE_ID');
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }
    ],
    metadata: {
      walletAddress: walletAddress || ''
    },
    subscription_data: {
      metadata: {
        walletAddress: walletAddress || ''
      }
    },
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancel`
  });

  return session;
}

async function createBillingPortalSession({ customerId }) {
  if (!customerId) {
    throw new Error('Missing customerId');
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/?portal=return`
  });

  return session;
}

module.exports = {
  stripe,
  createPremiumCheckoutSession,
  createBillingPortalSession
};
