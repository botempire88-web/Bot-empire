const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateChatCompletion({ systemPrompt, userPrompt }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]
  });

  return response.choices?.[0]?.message?.content || 'No response generated.';
}

module.exports = {
  generateChatCompletion
};
