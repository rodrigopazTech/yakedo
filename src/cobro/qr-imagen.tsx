import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** Dibuja el QR en la tablet a partir del `qrString`. Pey no manda la imagen. */
export function QrCoDi({ valor }: { valor: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    void QRCode.toDataURL(valor, { margin: 1, width: 286, errorCorrectionLevel: "M" }).then((url) => {
      if (vivo) setSrc(url)
    })
    return () => {
      vivo = false
    }
  }, [valor])
  return (
    <span className="n-qr-caja">
      {src ? <img src={src} alt="Código QR de CoDi" width={286} height={286} /> : null}
    </span>
  )
}
