const MUESTRAS = [
  { nombre: "Marca", hex: "#1F4FD1", variable: "--color-marca" },
  { nombre: "Marca oscuro", hex: "#163AA8", variable: "--color-marca-oscuro" },
  { nombre: "Acento", hex: "#FFB020", variable: "--color-acento" },
  { nombre: "Tinta", hex: "#1C1915", variable: "--color-tinta" },
  { nombre: "Fondo", hex: "#F4EFE6", variable: "--color-fondo" },
] as const;

export default function App() {
  return (
    <main className="prueba">
      <section className="prueba-lado" aria-label="Marca Yakedo">
        <div>
          <h1>Yakedo</h1>
          <p>Punto de venta para cobrar con CoDi y en efectivo.</p>
          <div className="prueba-acento" />
        </div>
        <p className="prueba-pie">Plus Jakarta Sans</p>
      </section>
      <section className="prueba-cuerpo" aria-label="Pantalla de prueba">
        <h2>Pantalla de prueba</h2>
        <p>
          Comprueba la fuente y la paleta. El diseño del punto de venta llega
          con Figma; esta vista solo revisa la marca en horizontal.
        </p>
        <ul className="muestras">
          {MUESTRAS.map((muestra) => (
            <li key={muestra.variable}>
              <figure className="muestra">
                <div
                  className="muestra-color"
                  style={{ background: `var(${muestra.variable})` }}
                />
                <figcaption>
                  <strong>{muestra.nombre}</strong>
                  <span>{muestra.hex}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="nota">Escritorio y tablet horizontal.</p>
      </section>
    </main>
  );
}
