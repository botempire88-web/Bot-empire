const {
  upsertSubscription,
  setSubscriptionStatusByStripeId
} = require('./subscriptionService');

function toIsoFromUnix(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

async function handleCheckoutCompleted(session) {
  const walletAddress = session.metadata?.walletAddress || null;

  await upsertSubscription({
    walletAddress,
    subscriptionTier: 'premium',
    status: 'active',
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: session.subscription || null,
    stripePriceId: process.env.STRIPE_PRICE_ID || null
  });
}

async function handleSubscriptionUpdated(subscription) {
  const walletAddress = subscription.metadata?.walletAddress || null;

  await upsertSubscription({
    walletAddress,
    subscriptionTier: 'premium',
    status: subscription.status,
    stripeCustomerId: subscription.customer || null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
    currentPeriodEnd: toIsoFromUnix(subscription.current_period_end)
  });
}

async function handleSubscriptionDeleted(subscription) {
  await setSubscriptionStatusByStripeId(subscription.id, {
    status: 'canceled',
    currentPeriodEnd: toIsoFromUnix(subscription.current_period_end)
  });
}

async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  await setSubscriptionStatusByStripeId(invoice.subscription, {
    status: 'active'
  });
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  await setSubscriptionStatusByStripeId(invoice.subscription, {
    status: 'past_due'
  });
}

module.exports = {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed
};
