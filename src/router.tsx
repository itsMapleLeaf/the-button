import {
  Middleware,
  Router,
  Status,
} from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { RateLimiter } from "https://deno.land/x/oak_rate_limit@v0.1.1/mod.ts"
import { renderToString } from "https://esm.sh/preact-render-to-string@6.0.2"
import { getCount, incrementCount } from "./count.ts"
import { Counter } from "./counter.tsx"
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
  context.response.status = Status.SwitchingProtocols
  const socket = context.upgrade()
  sockets.add(socket)

  socket.addEventListener("close", () => {
    sockets.delete(socket)
  })
})

router.get("/", async (context) => {
  const count = await getCount()
  const locales = context.request.acceptsLanguages()

  context.response.headers.set("Content-Type", "text/html; charset=utf-8")
  context.response.body = layout(
    renderToString(<Counter count={count} locales={locales} />),
  )
})

const rateLimit = await RateLimiter({
  // store: STORE, // Using MapStore by default.
  windowMs: 1000, // Window for the requests that can be made in miliseconds.
  max: 100, // Max requests within the predefined window.
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
