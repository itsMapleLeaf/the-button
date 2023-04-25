import { Middleware } from "https://deno.land/x/oak@v12.2.0/mod.ts"
import { layout } from "./layout.ts"

export const errorHandler: Middleware = async (context, next) => {
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
}
