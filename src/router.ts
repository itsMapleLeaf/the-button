import { Middleware, Router } from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { RateLimiter } from "https://deno.land/x/oak_rate_limit@v0.1.1/mod.ts"
import { getCount, incrementCount } from "./count.ts"
import { layout } from "./layout.ts"

const sockets = new Set<WebSocket>()

const channel = new BroadcastChannel("count")
channel.addEventListener("message", (event) => {
  const { count } = event.data
  for (const socket of sockets) {
    // i don't know why this happens
    if (socket.readyState !== WebSocket.OPEN) {
      sockets.delete(socket)
      continue
    }

    socket.send(count)
  }
})

export const router = new Router()

router.get("/socket", (context) => {
  const socket = context.upgrade()
  sockets.add(socket)

  socket.addEventListener("close", () => {
    sockets.delete(socket)
  })
})

router.get("/", async (context) => {
  const count = await getCount()
  const locale = context.request.acceptsLanguages()

  let formattedCount: string
  try {
    formattedCount = new Intl.NumberFormat(locale).format(count)
  } catch {
    formattedCount = String(count)
  }

  context.response.headers.set("Content-Type", "text/html; charset=utf-8")
  context.response.body = layout(/* HTML */ `
    <h1 class="text-4xl font-light">
      the button has been pressed
      <span class="tabular-nums" data-count="${count}">${formattedCount}</span>
      times.
    </h1>

    <form method="post" action="/increment">
      <button
        class="relative group py-4 px-5 transition hover:shadow-lg active:shadow-md hover:-translate-y-0.5 shadow-md shadow-black/25 active:duration-0 active:translate-y-0 select-none data-[disabled]:cursor-not-allowed"
        type="submit"
        data-button
      >
        <div
          class="bg-gradient-to-tr from-indigo-800 to-violet-800 absolute inset-0 border border-white/20 block rounded-md opacity-75 group-hover:opacity-100 transition group-active:duration-0 group-active:brightness-125 group-data-[disabled]:opacity-50"
        ></div>
        <div class="relative -translate-y-0.5 text-xl leading-none">press.</div>
      </button>
    </form>

    <script type="module">
      let socket

      function connect() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        socket = new WebSocket(protocol + "//" + location.host + "/socket")
        socket.addEventListener("message", (event) => {
          const count = Number(
            document.querySelector("[data-count]").dataset.count,
          )

          // don't update if the count is already higher
          document.querySelector("[data-count]").textContent =
            new Intl.NumberFormat().format(Math.max(count, Number(event.data)))
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
      const button = document.querySelector("[data-button]")
      form.addEventListener("submit", async (event) => {
        event.preventDefault()

        if (button.dataset.disabled) return
        button.dataset.disabled = "true"
        const url = new URL(form.action, window.location.href)
        url.searchParams.set("noredirect", "true")
        await fetch(url, { method: form.method })

        delete button.dataset.disabled
      })
    </script>
  `)
})

const rateLimit = await RateLimiter({
  // store: STORE, // Using MapStore by default.
  windowMs: 1000, // Window for the requests that can be made in miliseconds.
  max: 50, // Max requests within the predefined window.
  headers: true, // Default true, it will add the headers X-RateLimit-Limit, X-RateLimit-Remaining.
  message: "Too many requests.", // Default message if rate limit reached.
  statusCode: 429, // Default status code if rate limit reached.
})

router.post(
  "/increment",
  rateLimit as unknown as Middleware,
  async (context) => {
    new BroadcastChannel("count").postMessage({
      type: "count",
      count: await incrementCount(),
    })

    if (context.request.url.searchParams.get("noredirect") === "true") {
      context.response.status = 204
      return
    }

    context.response.redirect("/")
  },
)
