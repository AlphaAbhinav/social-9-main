import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vinext(),
    {
      name: "social9-api-config",
      configResolved(config) {
        if (config.command !== "build") return;
        const definedApiUrl = config.define["process.env.NEXT_PUBLIC_API_URL"];
        const apiUrl = typeof definedApiUrl === "string" ? JSON.parse(definedApiUrl) : undefined;
        if (
          typeof apiUrl !== "string" ||
          !URL.canParse(apiUrl) ||
          !["http:", "https:"].includes(new URL(apiUrl).protocol)
        ) {
          throw new Error("NEXT_PUBLIC_API_URL must be an absolute HTTP(S) backend URL at build time.");
        }
      },
    },
    nitro(),
  ],
});
