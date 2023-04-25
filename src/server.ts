import { toPathString } from "https://deno.land/std@0.184.0/fs/_util.ts"
import { Application, Router } from "https://deno.land/x/oak@v12.2.0/mod.ts"

const dev = Deno.args.includes("--dev") ? await import("./dev.ts") : undefined

const layout = (html: string) => /* HTML */ `
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
      ${dev?.liveReloadScript ?? ""}
    </head>
    <body
      class="flex flex-col items-center min-h-screen justify-center text-center p-6 max-w-screen-md mx-auto gap-6"
    >
      ${html}
    </body>
  </html>
`

const router = new Router()

router.get("/", async (context) => {
  const kv = await Deno.openKv()
  const entry = await kv.get(["count"])
  await kv.close()

  const count = typeof entry?.value === "string" ? BigInt(entry.value) : 0n

  context.response.headers.set("Content-Type", "text/html")
  context.response.body = layout(/* HTML */ `
    <h1 class="text-4xl font-light">
      the button has been pressed
      <span class="tabular-nums">${count}</span>
      times.
    </h1>
    <form method="post" action="/increment">
      <button
        class="relative group py-4 px-5 transition-all hover:shadow-lg active:shadow-md hover:-translate-y-0.5 shadow-md shadow-black/25 active:translate-y-0"
      >
        <div
          class="bg-gradient-to-tr from-indigo-800 to-violet-800 absolute inset-0 border border-white/20 block rounded-md opacity-75 group-hover:opacity-100 transition-opacity"
        ></div>
        <div class="relative -translate-y-0.5 text-xl leading-none">press.</div>
      </button>
    </form>
  `)
})

router.post("/increment", async (context) => {
  const kv = await Deno.openKv()

  const entry = await kv.get(["count"])
  const count = typeof entry.value === "string" ? BigInt(entry.value) : 0n

  await kv
    .atomic()
    .set(["count"], (count + 1n).toString())
    .commit()

  await kv.close()

  context.response.redirect("/")
})

const app = new Application()

app.use(async (context, next) => {
  try {
    await next()
  } catch (error) {
    console.error(error)
    context.response.headers.set("Content-Type", "text/html")
    context.response.body = layout(/* HTML */ `
      <h1 class="text-4xl font-light">something went wrong.</h1>
      <p>
        the
        <strong class="font-medium">doers</strong>
        have been notified.
      </p>
    `)
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async (context) => {
  await context.send({
    root: toPathString(new URL("../public", import.meta.url)),
  })
})

app.use((context) => {
  context.response.headers.set("Content-Type", "text/html")
  context.response.body = layout(/* HTML */ `
    <h1 class="text-4xl font-light">not found.</h1>
    <p>the resource you attempted to locate does not exist.</p>
  `)
})

app.addEventListener("listen", ({ hostname, port }) => {
  if (hostname === "0.0.0.0") hostname = "localhost"
  console.info(`🦕 Listening on http://${hostname}:${port}`)
})

const port = Number(Deno.env.get("PORT")) || 8000
await app.listen({ port })
