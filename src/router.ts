import { Router } from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { layout } from "./layout.ts"

export const router = new Router()

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
