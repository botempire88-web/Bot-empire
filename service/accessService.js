const { getFounderByWallet } = require('./founderService');
const { getSubscriptionByWallet } = require('./subscriptionService');

function isActivePaidPremium(subscription) {
  if (!subscription) return false;

  return (
    subscription.subscriptionTier === 'premium' &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  );
}

async function getAccessState(walletAddress) {
  const founderRecord = await getFounderByWallet(walletAddress);
  const subscription = await getSubscriptionByWallet(walletAddress);

  const isFounder = !!founderRecord?.isFounder;
  const hasPaidPremium = isActivePaidPremium(subscription);
  const hasPremiumAccess = isFounder || hasPaidPremium;

  let plan = 'basic';
  if (isFounder) {
    plan = 'founder-premium';
  } else if (hasPaidPremium) {
    plan = 'paid-premium';
  }

  return {
    walletAddress,
    plan,
    hasPremiumAccess,
    founderRecord,
    subscription
  };
}

module.exports = {
  getAccessState,
  isActivePaidPremium
};
