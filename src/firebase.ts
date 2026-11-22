import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { crearServicioFirebase } from "./acceso/servicio-firebase.ts";
import type { ServicioAuth } from "./acceso/tipos.ts";
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

let appIniciada: FirebaseApp | null | undefined;
let servicioIniciado: ServicioAuth | null | undefined;

/**
 * La sesión se queda en el navegador hasta que el comercio cierra sesión.
 * En desarrollo el reCAPTCHA de teléfono no sale: el emulador no manda SMS.
 */
export function iniciarFirebase(): FirebaseApp | null {
  if (appIniciada !== undefined) return appIniciada;

  if (!hayConfiguracionFirebase()) {
    appIniciada = null;
    return null;
  }

  const app = initializeApp(leerConfiguracionFirebase());
  const auth = getAuth(app);

  if (import.meta.env.DEV) {
    connectAuthEmulator(auth, EMULADORES.auth, { disableWarnings: true });
    auth.settings.appVerificationDisabledForTesting = true;
  }

  void setPersistence(auth, browserLocalPersistence);

  if (import.meta.env.DEV) {
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

  appIniciada = app;
  return app;
}

export function datosDeFirebase(): { db: Firestore; functions: Functions; storage: FirebaseStorage } | null {
  const app = iniciarFirebase();
  if (!app) return null;
  return { db: getFirestore(app), functions: getFunctions(app), storage: getStorage(app) };
}

export function servicioDeAuth(): ServicioAuth | null {
  if (servicioIniciado !== undefined) return servicioIniciado;
  const app = iniciarFirebase();
  if (!app) {
    servicioIniciado = null;
    return null;
  }
  servicioIniciado = crearServicioFirebase(getAuth(app));
  return servicioIniciado;
}
