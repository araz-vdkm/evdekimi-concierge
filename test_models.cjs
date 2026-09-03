const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.list();
    for (const model of response) {
      if (model.name.includes("flash")) {
        console.log(model.name);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
