/**
 * Legge le schede pubbliche dei ristoranti dal sito attuale (www.forgroups.it)
 * e salva i dati in prisma/data/ristoranti-pubblici.json.
 * Le foto NON vengono scaricate: si salvano gli indirizzi originali e il nuovo sito le mostra da lì.
 *
 *   npx tsx scripts/import-public-site.ts
 */
import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const BASE = "https://www.forgroups.it/";
const UA = { "User-Agent": "ForGroups-import/1.0" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const abs = (rel: string, from: string) => new URL(rel, from).toString();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

async function get(url: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.text();
    } catch {}
    await sleep(1000 * (i + 1));
  }
  throw new Error(`Impossibile leggere ${url}`);
}

type Restaurant = {
  legacyId: number | null;
  name: string;
  city: string;
  citySlug: string;
  address: string | null;
  zip: string | null;
  province: string | null;
  tags: string[];
  description: string | null;
  services: string | null;
  payments: string | null;
  openingHours: string | null;
  menus: { name: string; courses: string[] }[];
  cover: string | null;
  images: string[];
  lat: number | null;
  lng: number | null;
  sourceUrl: string;
};

type City = { name: string; slug: string; image: string | null; hero: string | null };

async function main() {
  const index = cheerio.load(await get(`${BASE}citta.php`));
  const cityPages = [...new Set(index('a[href*="citta/ristoranti-per-gruppi-"]').map((_, a) => abs(index(a).attr("href")!, BASE)).get())];
  console.log(`${cityPages.length} città`);

  const cities: City[] = [];
  const links = new Map<string, string>(); // url scheda → slug città
  for (const url of cityPages) {
    const $ = cheerio.load(await get(url));
    const slug = url.match(/ristoranti-per-gruppi-([a-z0-9-]+)\.php/)![1]!;
    const hero = $('img[src*="citta-gruppi-turistici"]').attr("src");
    const listImg = `${BASE}images/lista-ristoranti-gruppi-turistici/ristoranti-per-gruppi-${slug}.jpg`;
    cities.push({
      slug,
      name: cityName(clean($("h1").first().text()), slug),
      hero: hero ? abs(hero, url) : null,
      image: listImg,
    });
    $('a[href*="/r/ristoranti-per-gruppi-"]').each((_, a) => {
      links.set(abs($(a).attr("href")!, url), slug);
    });
    await sleep(250);
  }
  console.log(`${links.size} schede ristorante`);

  const out: Restaurant[] = [];
  const queue = [...links.entries()];
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [url, citySlug] = item;
      try {
        out.push(parseRestaurant(await get(url), url, citySlug));
        if (out.length % 20 === 0) console.log(`  ${out.length}/${links.size}`);
      } catch (e) {
        console.warn("  saltato", url, (e as Error).message);
      }
      await sleep(300);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  out.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

  // Verifica disponibilità delle immagini di copertina (HEAD)
  let missing = 0;
  for (const r of out) {
    if (!r.cover) continue;
    const res = await fetch(r.cover, { method: "HEAD", headers: UA }).catch(() => null);
    if (!res?.ok) {
      r.cover = r.images[0] ?? null;
      missing++;
    }
  }
  // Foto delle città: tieni solo quelle che esistono davvero
  const ok = async (u: string | null) => (u ? (await fetch(u, { method: "HEAD", headers: UA }).catch(() => null))?.ok === true : false);
  for (const c of cities) {
    if (!(await ok(c.image))) c.image = null;
    if (!(await ok(c.hero))) c.hero = null;
    c.image ??= c.hero ?? out.find((r) => r.citySlug === c.slug)?.cover ?? null;
    c.hero ??= c.image;
  }
  writeFileSync("prisma/data/ristoranti-pubblici.json", JSON.stringify({ importedAt: new Date().toISOString(), source: BASE, cities, restaurants: out }, null, 2));
  console.log(`Salvati ${out.length} ristoranti e ${cities.length} città (${missing} copertine sostituite)`);
}

/** "Ristoranti per Gruppi a Civita di Bagnoregio" → "Civita di Bagnoregio" (con ripiego sullo slug) */
function cityName(h1: string, slug: string) {
  const m = h1.match(/ristoranti per gruppi\s+(?:a|ad|in|di)\s+(.+)$/i);
  const fromSlug = slug.split("-").map((w) => (["di", "del", "della"].includes(w) ? w : w[0]!.toUpperCase() + w.slice(1))).join(" ");
  return m?.[1]?.trim() || fromSlug;
}

function parseRestaurant(html: string, url: string, citySlug: string): Restaurant {
  const $ = cheerio.load(html);
  const name = clean($("h1").first().text());
  const where = clean($(".title-scheda .dove").first().text());
  // "Via della Croce, 38 - 00187 Roma (RM)"
  const m = where.match(/^(.*?)\s*-\s*(\d{5})\s+(.*?)\s*(?:\(([A-Z]{2})\))?$/);
  const tags = [...new Set($(".title-scheda .tag span").map((_, s) => clean($(s).text())).get().filter(Boolean))];

  const info: Record<string, string> = {};
  $(".box-info-scheda").each((_, b) => {
    const k = clean($(b).find(".tit-box-info").text()).toLowerCase();
    $(b).find(".tit-box-info").remove();
    info[k] = clean($(b).text());
  });

  // descrizione: tutto il testo tra i pulsanti (dopo la galleria) e "Altre informazioni"
  const parts: string[] = [];
  const left = $(".page-scheda-sx").first();
  let started = false;
  let buf = "";
  const flush = () => {
    const t = clean(buf);
    if (t) parts.push(t);
    buf = "";
  };
  for (const node of left.contents().toArray()) {
    const el = $(node);
    if (node.type === "tag" && el.hasClass("bottoni-mobile")) { started = true; continue; }
    if (!started) continue;
    if (node.type === "tag" && (node.tagName === "h4" || el.hasClass("box-info-scheda"))) break;
    if (node.type === "text") { buf += ` ${$(node).text()}`; continue; }
    if (node.type !== "tag" || ["script", "style"].includes(node.tagName)) continue;
    if (node.tagName === "br") { if (buf.trim()) flush(); continue; }
    if (node.tagName === "ul" || node.tagName === "ol") {
      flush();
      el.find("li").each((__, li) => { const t = clean($(li).text()); if (t) parts.push(`• ${t}`); });
      continue;
    }
    if (["p", "div", "h3", "h5"].includes(node.tagName)) { flush(); buf = el.text(); flush(); continue; }
    buf += ` ${el.text()}`;
  }
  flush();

  const menus: Restaurant["menus"] = [];
  $(".click-bar-plus").each((_, a) => {
    const menuName = clean($(a).text());
    const box = $(a).next(".bar-plus");
    const courses = box.find(".menu-scheda span").map((__, s) => clean($(s).text()).replace(/^n\.\d+:\s*/, "")).get().filter(Boolean);
    if (menuName) menus.push({ name: menuName, courses });
  });

  const full = $('#slide-scheda a[data-fancybox="images"]').map((_, a) => abs($(a).attr("href")!, url)).get();
  const coverRel = $("#slide-scheda .big-img img").attr("src");
  const ld = $('script[type="application/ld+json"]').first().html() ?? "";
  const lat = Number(ld.match(/"latitude":\s*([\d.-]+)/)?.[1]);
  const lng = Number(ld.match(/"longitude":\s*([\d.-]+)/)?.[1]);
  const idMatch = html.match(/ID_ATT=(\d+)/) ?? html.match(/attivita=(\d+)/);

  return {
    legacyId: idMatch ? Number(idMatch[1]) : null,
    name,
    city: m?.[3]?.trim() || citySlug,
    citySlug,
    address: m?.[1]?.trim() || where || null,
    zip: m?.[2] ?? null,
    province: m?.[4] ?? null,
    tags,
    description: parts.join("\n\n") || null,
    services: info["servizi"] ?? null,
    payments: info["pagamenti"] ?? null,
    openingHours: info["orari di apertura"] ?? null,
    menus,
    cover: coverRel ? abs(coverRel, url) : (full[0] ?? null),
    images: [...new Set(full)],
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    sourceUrl: url,
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
