const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const retryMatch = `const generateWithRetry = async (aiInstance: any, params: any, maxRetries = 3) => {
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
};`;

const retryReplace = `const generateWithRetry = async (aiInstance: any, params: any, maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await aiInstance.models.generateContent(params);
    } catch (error: any) {
      const status = error.status || error?.error?.code || (error.message && error.message.includes('503') ? 503 : null) || (error.message && error.message.includes('500') ? 500 : null) || (error.message && error.message.includes('429') ? 429 : null);
      const isRetryable = status === 503 || status === 429 || status === 500;
      if (isRetryable && i < maxRetries - 1) {
        console.warn(\`Gemini API error (\${status}). Retrying \${i + 1}...\`);
        // Exponential backoff: 2s, 4s, 8s, 16s...
        const waitTime = Math.pow(2, i) * 2000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
};`;

code = code.replace(retryMatch, retryReplace);
fs.writeFileSync('server.ts', code);
console.log('Patched server.ts');
