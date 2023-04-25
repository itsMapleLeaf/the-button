import * as path from "https://deno.land/std@0.184.0/path/mod.ts"
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts"

export const devSocketPort = 42069

let server: Deno.Process
async function runServer() {
  server?.close()
  server = Deno.run({
    cmd: "deno run --unstable --allow-net --allow-read --allow-env=PORT --watch src/server.ts --dev".split(
      " ",
    ),
  })
}

async function main() {
  Deno.run({
    cmd: "pnpx.cmd tailwindcss build -o public/tailwind.css -w".split(" "),
  })

  const socket = new WebSocketServer(devSocketPort)

  await runServer()

  for await (const event of Deno.watchFs(["src", "public"])) {
    for (const updatedPath of event.paths) {
      console.info(`[${event.kind}]`, path.relative(Deno.cwd(), updatedPath))
    }
    await runServer()
    for (const client of socket.clients) {
      client.send("reload")
    }
  }
}

if (import.meta.main) {
  await main()
}
