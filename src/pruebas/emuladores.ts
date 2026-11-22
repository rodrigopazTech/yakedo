import { spawn, type ChildProcess } from "node:child_process"

let proceso: ChildProcess | null = null
let loArrancamos = false

async function puertoAbierto(puerto: number): Promise<boolean> {
  try {
      const respuesta = await fetch(`http://127.0.0.1:${puerto}`, { signal: AbortSignal.timeout(1500) })
      return respuesta.status > 0
  } catch {
    return false
  }
}

async function esperar(puerto: number): Promise<void> {
  const limite = Date.now() + 120_000
  while (Date.now() < limite) {
    if (await puertoAbierto(puerto)) return
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error(`El emulador del puerto ${puerto} no respondió.`)
}

export async function setup(): Promise<void> {
  const [auth, firestore, storage] = await Promise.all([
    puertoAbierto(9099),
    puertoAbierto(8080),
    puertoAbierto(9199),
  ])
  if (auth && firestore && storage) return

  loArrancamos = true
  proceso = spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,firestore,storage", "--project", "yakedo-pos"],
    {
      cwd: "/workspace",
      detached: true,
      stdio: "ignore",
      env: { ...process.env, CI: "1" },
    },
  )
  await Promise.all([esperar(9099), esperar(8080), esperar(9199)])
}

export async function teardown(): Promise<void> {
  if (!loArrancamos || !proceso?.pid) return
  try {
    process.kill(-proceso.pid, "SIGTERM")
  } catch {
    proceso.kill("SIGTERM")
  }
}
