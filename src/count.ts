import { Redis } from "https://deno.land/x/upstash_redis@v1.20.4/mod.ts"
import { upstashToken, upstashUrl } from "./constants.ts"

const redis = new Redis({
  url: upstashUrl,
  token: upstashToken,
  automaticDeserialization: false,
})

export async function getCount() {
  const countString = await redis.get("count")
  return typeof countString === "string" ? BigInt(countString) : 0n
}

export async function incrementCount() {
  const count = await getCount()
  const newCount = String(count + 1n)
  await redis.set("count", newCount)
  return newCount
}
