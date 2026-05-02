
const prisma = require('../lib/prisma');

const FOUNDER_LIMIT = 1000;
const FOUNDER_EMP_TOTAL = 10000;
const FOUNDER_EMP_UNLOCKED = 2500;
const FOUNDER_EMP_VESTED = 7500;

function normalizeWallet(wallet) {
  return String(wallet || '').trim().toLowerCase();
}

async function getOrCreateUser(wallet) {
  const walletAddress = normalizeWallet(wallet);
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  let user = await prisma.user.findUnique({
    where: { walletAddress }
  });

  if (!user) {
    user = await prisma.user.create({
      data: { walletAddress }
    });
  }

  return user;
}

async function getFounderStats() {
  const founderCount = await prisma.founderRecord.count({
    where: { isFounder: true }
  });

  return {
    founderLimit: FOUNDER_LIMIT,
    founderCount,
    slotsRemaining: Math.max(0, FOUNDER_LIMIT - founderCount)
  };
}

async function getFounderByWallet(wallet) {
  const walletAddress = normalizeWallet(wallet);
  if (!walletAddress) return null;

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    include: { founderRecord: true }
  });

  if (!user || !user.founderRecord) return null;

  return {
    walletAddress: user.walletAddress,
    ...user.founderRecord
  };
}

async function registerFounder(wallet) {
  const user = await getOrCreateUser(wallet);

  const existing = await prisma.founderRecord.findUnique({
    where: { userId: user.id }
  });

  if (existing) {
    return {
      walletAddress: user.walletAddress,
      ...existing
    };
  }

  const founderCount = await prisma.founderRecord.count({
    where: { isFounder: true }
  });

  const qualifiesAsFounder = founderCount < FOUNDER_LIMIT;

  const founderRecord = await prisma.founderRecord.create({
    data: {
      userId: user.id,
      founderRank: qualifiesAsFounder ? founderCount + 1 : null,
      isFounder: qualifiesAsFounder,
      founderBadge: qualifiesAsFounder ? 'Empire 1000 Founder' : null,
      subscriptionTier: qualifiesAsFounder ? 'premium' : 'basic',
      empGiftTotal: qualifiesAsFounder ? FOUNDER_EMP_TOTAL : 0,
      empGiftUnlocked: qualifiesAsFounder ? FOUNDER_EMP_UNLOCKED : 0,
      empGiftVested: qualifiesAsFounder ? FOUNDER_EMP_VESTED : 0,
      empClaimed: 0
    }
  });

  return {
    walletAddress: user.walletAddress,
    ...founderRecord
  };
}

module.exports = {
  getFounderStats,
  getFounderByWallet,
  registerFounder,
  getOrCreateUser
};
