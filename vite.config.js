import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import analyzeHandler from "./api/analyze.js";
import statusHandler from "./api/ai-status.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY;
  }

  if (env.GEMINI_MODEL) {
    process.env.GEMINI_MODEL ||= env.GEMINI_MODEL;
  }

  if (env.GEMINI_API_BASE_URL) {
    process.env.GEMINI_API_BASE_URL ||= env.GEMINI_API_BASE_URL;
  }

  return {
    plugins: [
      react(),
      {
        name: "confere-agora-api-dev",
        configureServer(server) {
          server.middlewares.use("/api/analyze", analyzeHandler);
          server.middlewares.use("/api/ai-status", statusHandler);
        },
      },
    ],
  };
});
