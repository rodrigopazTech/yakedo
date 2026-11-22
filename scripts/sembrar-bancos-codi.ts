/**
 * Crea config/bancosCodi con la lista del 17 de noviembre de 2026.
 *
 * Emulador:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=yakedo-pos node --experimental-strip-types scripts/sembrar-bancos-codi.ts
 *
 * Proyecto (yakedo-pos): usa las credenciales de aplicación ya instaladas
 * en la máquina. No pongas llaves ni JSON de servicio en el repositorio.
 */
import { createRequire } from "node:module"
import { LISTA_INICIAL } from "../src/cobro/bancos.ts"

const require = createRequire(new URL("../functions/package.json", import.meta.url))
const { initializeApp } = require("firebase-admin/app") as typeof import("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore")

const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const proyecto = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "yakedo-pos"

if (!emulador && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
  console.error("Define FIRESTORE_EMULATOR_HOST o entra con credenciales de aplicación. No subas llaves al repo.")
  process.exit(1)
}

initializeApp({ projectId: proyecto })
const db = getFirestore()
await db.doc("config/bancosCodi").set(LISTA_INICIAL)
console.log(`config/bancosCodi listo en ${proyecto}${emulador ? " (emulador)" : ""}.`)
