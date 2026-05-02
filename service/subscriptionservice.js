const prisma = require('../lib/prisma');
const { getOrCreateUser } = require('./founderService');

function normalizeWallet(wallet) {
  return String(wallet || '').trim().toLowerCase();
}

async function getSubscriptionByWallet(wallet) {
  const walletAddress = normalizeWallet(wallet);
  if (!walletAddress) return null;

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    include: { subscription: true }
  });

  if (!user || !user.subscription) return null;

  return {
    walletAddress: user.walletAddress,
    ...user.subscription
  };
}

async function getSubscriptionByStripeSubscriptionId(stripeSubscriptionId) {
  if (!stripeSubscriptionId) return null;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    include: { user: true }
  });

  if (!subscription) return null;

  return {
    walletAddress: subscription.user.walletAddress,
    ...subscription
  };
}

async function upsertSubscription(record) {
  const user = await getOrCreateUser(record.walletAddress);

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      subscriptionTier: record.subscriptionTier || 'premium',
      status: record.status || 'inactive',
      stripeCustomerId: record.stripeCustomerId || null,
      stripeSubscriptionId: record.stripeSubscriptionId || null,
      stripePriceId: record.stripePriceId || null,
      currentPeriodEnd: record.currentPeriodEnd ? new Date(record.currentPeriodEnd) : null
    },
    create: {
      userId: user.id,
      subscriptionTier: record.subscriptionTier || 'premium',
      status: record.status || 'inactive',
      stripeCustomerId: record.stripeCustomerId || null,
      stripeSubscriptionId: record.stripeSubscriptionId || null,
      stripePriceId: record.stripePriceId || null,
      currentPeriodEnd: record.currentPeriodEnd ? new Date(record.currentPeriodEnd) : null
    }
  });

  return {
    walletAddress: user.walletAddress,
    ...subscription
  };
}

async function setSubscriptionStatusByStripeId(stripeSubscriptionId, updates) {
  if (!stripeSubscriptionId) return null;

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    include: { user: true }
  });

  if (!existing) return null;

  const updated = await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: {
      status: updates.status ?? existing.status,
      currentPeriodEnd: updates.currentPeriodEnd
        ? new Date(updates.currentPeriodEnd)
        : existing.currentPeriodEnd
    },
    include: { user: true }
  });

  return {
    walletAddress: updated.user.walletAddress,
    ...updated
  };
}

module.exports = {
  getSubscriptionByWallet,
  getSubscriptionByStripeSubscriptionId,
  upsertSubscription,
  setSubscriptionStatusByStripeId
};
