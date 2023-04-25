import { toPathString } from "https://deno.land/std@0.184.0/fs/_util.ts"
import { Application } from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { port } from "./constants.ts"
import { errorHandler } from "./error-handler.ts"
import { layout } from "./layout.ts"
import { router } from "./router.ts"

const app = new Application()

app.use(errorHandler)
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

if (import.meta.main) {
  await app.listen({ port })
}

export { app }
