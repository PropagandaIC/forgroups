import { db } from "./db";

/** Codici leggibili e progressivi: FG-10078, RQ-3620. Continuano la numerazione del vecchio sistema. */
export async function nextCode(name: "booking" | "inquiry"): Promise<string> {
  const start = name === "booking" ? 10100 : 3700;
  const c = await db.counter.upsert({
    where: { name },
    create: { name, value: start },
    update: { value: { increment: 1 } },
  });
  return `${name === "booking" ? "FG" : "RQ"}-${c.value}`;
}
