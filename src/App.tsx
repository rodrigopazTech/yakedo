import { useMemo } from "react";
import { Acceso } from "./acceso/Acceso.tsx";
import { leerCobroActivo } from "./acceso/sesion.ts";
import { servicioDeAuth } from "./firebase.ts";

export default function App() {
  const servicio = useMemo(() => servicioDeAuth(), []);
  const hayCobroActivo = useMemo(
    () => leerCobroActivo(window.location.search),
    [],
  );

  return <Acceso servicio={servicio} hayCobroActivo={hayCobroActivo} />;
}
