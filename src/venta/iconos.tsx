export function Icono({ nombre, tamano = 22 }: { nombre: IconoNombre; tamano?: number }) {
  const comun = { width: tamano, height: tamano, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const }
  if (nombre === "buscar") {
    return (
      <svg {...comun}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "historial") {
    return (
      <svg {...comun}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "ajustes") {
    return (
      <svg {...comun}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3V5M12 19V21M3 12H5M19 12H21M5.6 5.6L7 7M17 17L18.4 18.4M18.4 5.6L17 7M7 17L5.6 18.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "reloj") {
    return (
      <svg {...comun}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8V12L14.5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "mas") {
    return (
      <svg {...comun}>
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "menos") {
    return (
      <svg {...comun}>
        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "cerrar") {
    return (
      <svg {...comun}>
        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (nombre === "ticket") {
    return (
      <svg {...comun}>
        <path d="M6 4H18V20L15 18L12 20L9 18L6 20V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (nombre === "tienda") {
    return (
      <svg {...comun}>
        <path d="M4 9L6 4H18L20 9M4 9H20V20H4V9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (nombre === "billete") {
    return (
      <svg {...comun}>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (nombre === "qr") {
    return (
      <svg {...comun}>
        <path d="M4 4H9V9H4V4ZM15 4H20V9H15V4ZM4 15H9V20H4V15ZM15 15H17V17H15V15ZM18 15H20V20H18V18H16V20H15V18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (nombre === "borrar") {
    return (
      <svg {...comun}>
        <path d="M8 6L4 12L8 18H20V6H8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M11 9L16 15M16 9L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg {...comun}>
      <path d="M4 20H8L18 10L14 6L4 16V20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export type IconoNombre =
  | "buscar"
  | "historial"
  | "ajustes"
  | "reloj"
  | "mas"
  | "menos"
  | "cerrar"
  | "ticket"
  | "tienda"
  | "billete"
  | "qr"
  | "borrar"
  | "lapiz"
