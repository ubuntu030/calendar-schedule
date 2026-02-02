import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // 設定項目的基礎路徑，用於 GitHub Pages 部署
  // 格式為 '/<你的倉庫名稱>/'
  base: '/calendar-schedule/',
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
});
