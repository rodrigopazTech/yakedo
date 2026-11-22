import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import {
  hayConfiguracionFirebase,
  leerConfiguracionFirebase,
} from "./configuracion-firebase.ts";

/** Puertos definidos en firebase.json. El cliente solo los usa en desarrollo. */
const EMULADORES = {
  auth: "http://127.0.0.1:9099",
  firestore: { host: "127.0.0.1", puerto: 8080 },
  functions: { host: "127.0.0.1", puerto: 5001 },
  storage: { host: "127.0.0.1", puerto: 9199 },
} as const;

/**
 * Prepara Auth, Firestore, Functions y Storage.
 * Sin variables VITE_ no hace nada: la pantalla de prueba no necesita sesión.
 * En desarrollo, si hay configuración, habla con los emuladores locales.
 */
export function iniciarFirebase(): FirebaseApp | null {
  if (!hayConfiguracionFirebase()) {
    return null;
  }

  const app = initializeApp(leerConfiguracionFirebase());

  if (import.meta.env.DEV) {
    connectAuthEmulator(getAuth(app), EMULADORES.auth, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(
      getFirestore(app),
      EMULADORES.firestore.host,
      EMULADORES.firestore.puerto,
    );
    connectFunctionsEmulator(
      getFunctions(app),
      EMULADORES.functions.host,
      EMULADORES.functions.puerto,
    );
    connectStorageEmulator(
      getStorage(app),
      EMULADORES.storage.host,
      EMULADORES.storage.puerto,
    );
  }

  return app;
}
