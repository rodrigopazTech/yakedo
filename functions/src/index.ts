import { setGlobalOptions } from "firebase-functions/v2";

/**
 * Entrada de Cloud Functions.
 *
 * Todavía no hay funciones de negocio: autenticación, catálogo y cobro
 * llegan en tareas posteriores. Toda llamada a Pey saldrá de este paquete;
 * el cliente no habla con Pey.
 *
 * La llave y el secreto del webhook se leen de Secret Manager
 * (PEY_API_KEY y PEY_WEBHOOK_SECRET). No viven en el repositorio.
 */
setGlobalOptions({ maxInstances: 10 });
