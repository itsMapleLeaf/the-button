import { Server } from "https://deno.land/std@0.184.0/http/mod.ts"
import * as path from "https://deno.land/std@0.184.0/path/mod.ts"
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts"
import { devSocketPort, port } from "../src/constants.ts"
import { app } from "../src/server.ts"

let server: Server | undefined

function runServer() {
  server?.close()
  server = new Server({
    port,
    handler: async (request) => {
      const response = await app.handle(request)
      return response!
    },
  })
  console.info(`🦕 listening on http://localhost:${port}/`)
  server.listenAndServe()
}

async function main() {
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
