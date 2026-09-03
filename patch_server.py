import re

with open('server.ts', 'r') as f:
    content = f.read()

# Add Type import if not present
if '{ Type, GoogleGenAI }' not in content:
    content = content.replace('import { GoogleGenAI } from "@google/genai";', 'import { GoogleGenAI, Type } from "@google/genai";')

pattern = re.compile(
    r'const prompt = `Analyze this passport image.*?const response = await generateWithRetry\(ai, \{\s*model: \'gemini-2.5-flash\',\s*contents: \[\s*\{\s*role: "user",\s*parts: \[\s*\{\s*text: prompt\s*\},.*?\]\s*\}\s*\]\s*\}\);\s*const text = response\.text;\s*if \(!text\) throw new Error\("No response from AI"\);\s*const cleaned = text\.replace\(/```json/g, ""\)\.replace\(/```/g, ""\)\.trim\(\);\s*const result = JSON\.parse\(cleaned\);',
    re.DOTALL
)

replacement = """const prompt = `Extract passport details. Return missing fields as empty string.`;

      const response = await generateWithRetry(ai, {
        model: 'gemini-2.5-flash-8b',
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              passportNumber: { type: Type.STRING },
              nationality: { type: Type.STRING, description: "Official country name" },
              dob: { type: Type.STRING, description: "YYYY-MM-DD" },
              gender: { type: Type.STRING, description: "Male or Female" }
            },
            required: ["fullName", "passportNumber", "nationality", "dob", "gender"]
          }
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      const result = JSON.parse(text);"""

new_content = pattern.sub(replacement, content)

with open('server.ts', 'w') as f:
    f.write(new_content)

