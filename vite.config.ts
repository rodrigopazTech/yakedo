import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const authDelNavegador = fileURLToPath(
  new URL("./node_modules/@firebase/auth/dist/esm/index.js", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Vitest corre en Node y esa compilación no trae el teléfono.
      // La app es web: las pruebas usan el mismo paquete del navegador.
      "firebase/auth": authDelNavegador,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/pruebas/emuladores.ts"],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
