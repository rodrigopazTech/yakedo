/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hayConfiguracionFirebase } from "./configuracion-firebase.ts";

const css = readFileSync(new URL("./estilos.css", import.meta.url), "utf8");

const COLORES_DE_MARCA = [
  "#1F4FD1",
  "#163AA8",
  "#FFB020",
  "#1C1915",
  "#F4EFE6",
] as const;

describe("base del proyecto", () => {
  it("declara Plus Jakarta Sans y la paleta en el archivo de estilos", () => {
    expect(css).toContain("Plus Jakarta Sans");
    expect(css).toContain("--color-marca");
    expect(css).toContain("--color-marca-oscuro");
    expect(css).toContain("--color-acento");
    expect(css).toContain("--color-tinta");
    expect(css).toContain("--color-fondo");

    for (const color of COLORES_DE_MARCA) {
      expect(css).toContain(color);
    }
  });

  it("no trae la configuración web de Firebase embebida", () => {
    expect(
      hayConfiguracionFirebase({
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
      }),
    ).toBe(false);
    expect(hayConfiguracionFirebase()).toBe(false);
  });
});
