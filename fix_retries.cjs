const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const retryFunction = `
const generateWithRetry = async (aiInstance: any, params: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await aiInstance.models.generateContent(params);
    } catch (error: any) {
      const status = error.status || error?.error?.code || (error.message && error.message.includes('503') ? 503 : null);
      const isRetryable = status === 503 || status === 429 || status === 500;
      if (isRetryable && i < maxRetries - 1) {
        console.warn(\`Gemini API error (\${status}). Retrying \${i + 1}...\`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      throw error;
    }
  }
};
`;

// Insert the helper function after the ai initialization
content = content.replace(
  /const ai = new GoogleGenAI\(\{ apiKey: process\.env\.GEMINI_API_KEY \}\);/,
  `const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n${retryFunction}`
);

// Replace ai.models.generateContent with generateWithRetry(ai, ...)
content = content.replace(
  /await ai\.models\.generateContent\(\{/g,
  `await generateWithRetry(ai, {`
);

fs.writeFileSync('server.ts', content, 'utf8');
