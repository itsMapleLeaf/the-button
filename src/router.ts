import { Router } from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { getCount, incrementCount } from "./count.ts"
import { layout } from "./layout.ts"

const sockets = new Set<WebSocket>()

const channel = new BroadcastChannel("count")
channel.addEventListener("message", (event) => {
  const { count } = event.data
  for (const socket of sockets) {
    socket.send(JSON.stringify({ type: "set-count", count }))
  }
})

export const router = new Router()

router.get("/socket", (context) => {
  const socket = context.upgrade()
  sockets.add(socket)

  socket.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data)
    if (message.type === "increment") {
      const count = await incrementCount()
      new BroadcastChannel("count").postMessage({ type: "count", count })
    }
  })

  socket.addEventListener("close", () => {
    sockets.delete(socket)
  })
})

router.get("/", async (context) => {
  const count = await getCount()

  context.response.headers.set("Content-Type", "text/html; charset=utf-8")
  context.response.body = layout(/* HTML */ `
    <h1 class="text-4xl font-light">
      the button has been pressed
      <span class="tabular-nums" data-count>${count}</span>
      times.
    </h1>

    <form method="post" action="/increment">
      <button
        class="relative group py-4 px-5 transition hover:shadow-lg active:shadow-md hover:-translate-y-0.5 shadow-md shadow-black/25 active:duration-0 active:translate-y-0"
        type="submit"
      >
        <div
          class="bg-gradient-to-tr from-indigo-800 to-violet-800 absolute inset-0 border border-white/20 block rounded-md opacity-75 group-hover:opacity-100 transition group-active:duration-0 group-active:brightness-125"
        ></div>
        <div class="relative -translate-y-0.5 text-xl leading-none">press.</div>
      </button>
    </form>

    <script type="module">
      let socket

      function connect() {
        socket = new WebSocket("ws://" + location.host + "/socket")
        socket.addEventListener("message", (event) => {
          const message = JSON.parse(event.data)
          if (message.type === "set-count") {
            const count = Number(
              document.querySelector("[data-count]").textContent,
            )

            // don't update if the count is already higher
            document.querySelector("[data-count]").textContent = Math.max(
              message.count,
              count,
            )
          }
        })
        socket.addEventListener("close", () => {
          setTimeout(connect, 1000)
        })
        socket.addEventListener("error", () => {
          setTimeout(connect, 1000)
        })
      }
      connect()

      const form = document.querySelector("form")
      form.addEventListener("submit", (event) => {
        event.preventDefault()
        socket?.send(JSON.stringify({ type: "increment" }))

        // optimistic update
        const count = Number(document.querySelector("[data-count]").textContent)
        document.querySelector("[data-count]").textContent = count + 1
      })
    </script>
  `)
})

router.post("/increment", async (context) => {
  await incrementCount()
  context.response.redirect("/")
})
