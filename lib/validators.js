function isValidWalletAddress(walletAddress) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(walletAddress || '').trim());
}

function validateScoutPrompt(prompt) {
  const text = String(prompt || '').trim();

  if (!text) {
    return 'Prompt is required';
  }

  if (text.length < 5) {
    return 'Prompt is too short';
  }

  if (text.length > 4000) {
    return 'Prompt is too long';
  }

  return null;
}

module.exports = {
  isValidWalletAddress,
  validateScoutPrompt
};
