import "https://deno.land/x/dotenv@v3.2.2/load.ts"

function raise(error: unknown): never {
  throw typeof error === "string" ? new Error(error) : error
}

export const port = Number(Deno.env.get("PORT")) || 8000
export const devSocketPort = 42069

export const upstashUrl =
  Deno.env.get("UPSTASH_URL") ?? raise("UPSTASH_URL is not set")

export const upstashToken =
  Deno.env.get("UPSTASH_TOKEN") ?? raise("UPSTASH_TOKEN is not set")
