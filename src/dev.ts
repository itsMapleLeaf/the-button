import { devSocketPort } from "../watch.ts"

export const liveReloadScript = /* HTML */ `
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
