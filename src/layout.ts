import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts"
import { devSocketPort } from "./constants.ts"

const isDev = Deno.args.includes("--dev")

if (isDev) {
  new WebSocketServer(devSocketPort)
}

const liveReloadScript = /* HTML */ `
  <script type="module">
    const socket = new WebSocket("ws://localhost:${devSocketPort}")
    socket.addEventListener("open", () => {
      console.info("Socket connected")
    })
    socket.addEventListener("message", (event) => {
      if (event.data === "reload") {
        window.location.reload()
      }
    })
    socket.addEventListener("close", async () => {
      console.info("Socket closed, reloading...")
      while (true) {
        try {
          await fetch("/")
          window.location.reload()
        } catch {}
        await new Promise((res) => setTimeout(res, 50))
      }
    })
  </script>
`

export const layout = (html: string) => /* HTML */ `
  <!DOCTYPE html>
  <html
    lang="en"
    class="bg-slate-950 bg-gradient-to-tr from-slate-950 to-slate-900 text-slate-100"
  >
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>the button</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/tailwind.css" />
      ${isDev ? liveReloadScript : ""}
    </head>
    <body
      class="flex flex-col items-center min-h-screen justify-center text-center p-6 max-w-screen-md mx-auto gap-6"
    >
      ${html}
    </body>
  </html>
`
