import * as path from "https://deno.land/std@0.184.0/path/mod.ts"
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts"
import { devSocketPort } from "./src/constants.ts"

let server: Deno.Process
function runServer() {
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

  runServer()

  for await (const event of Deno.watchFs(["src", "public"])) {
    for (const updatedPath of event.paths) {
      console.info(`[${event.kind}]`, path.relative(Deno.cwd(), updatedPath))
    }
    runServer()
    for (const client of socket.clients) {
      client.send("reload")
    }
  }
}

if (import.meta.main) {
  await main()
}
