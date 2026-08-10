import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// .env.local에서 API Key 읽기
const env = fs.readFileSync("../.env.local", "utf8");

const match = env.match(/VITE_GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);

if (!match) {
  console.error("❌ .env.local에서 VITE_GEMINI_API_KEY를 찾지 못했습니다.");
  process.exit(1);
}

const apiKey = match[1].trim();

console.log("API Key 발견:", apiKey.substring(0, 6) + "...");
console.log("Gemini 연결 테스트 시작...");

const ai = new GoogleGenAI({
  apiKey: apiKey
});

try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "Reply with exactly: Gemini API connection successful"
  });

  console.log("\n✅ Gemini API 연결 성공");
  console.log("Gemini 응답:");
  console.log(response.text);

} catch (error) {

  console.error("\n❌ Gemini API 연결 실패");
  console.error(error);

}