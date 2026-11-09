/* Dati dimostrativi: nomi e contatti sono inventati. */
import { PrismaClient, type OrganizerType, type BookingStatus, type InquiryStage, type PaymentMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]!;
const int = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dayUTC = (offset: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset));
};

const CITIES: [string, string, number, number][] = [
  ["Roma", "RM", 41.9, 12.49],
  ["Firenze", "FI", 43.77, 11.25],
  ["Venezia", "VE", 45.44, 12.33],
  ["Napoli", "NA", 40.85, 14.27],
  ["Milano", "MI", 45.46, 9.19],
  ["Sorrento", "NA", 40.63, 14.38],
  ["Assisi", "PG", 43.07, 12.62],
];

const RESTAURANTS: [string, string, string, string][] = [
  ["Trattoria Er Cuppolone", "Roma", "Romana tradizionale", "Studenti,Gruppi turistici,Pellegrini"],
  ["Hostaria dei Fori", "Roma", "Romana, Pizza", "Gruppi turistici,Crocieristi"],
  ["Osteria Campo de' Fiori", "Roma", "Cucina laziale", "Adulti,Incentive"],
  ["Terrazza Gianicolo", "Roma", "Mediterranea, Pesce", "Incentive,Cene aziendali,Matrimoni"],
  ["Pizzeria Trastevere 1950", "Roma", "Pizza napoletana", "Studenti,Famiglie"],
  ["Il Cortile di San Pietro", "Roma", "Italiana", "Pellegrini,Gruppi parrocchiali"],
  ["Antica Locanda Colosseo", "Roma", "Romana, Grill", "Gruppi turistici,Adulti"],
  ["Ristorante Piazza Navona", "Roma", "Italiana, Pesce", "Incentive,Adulti"],
  ["Cantina del Testaccio", "Roma", "Romana, Vini", "Degustazioni,Adulti"],
  ["La Bottega di Prati", "Roma", "Pizza, Cucina romana", "Studenti,Gruppi turistici"],
  ["Buca dei Medici", "Firenze", "Toscana, Bistecca", "Gruppi turistici,Adulti"],
  ["Trattoria Ponte Vecchio", "Firenze", "Toscana", "Studenti,Gruppi turistici"],
  ["Villa sulle Colline", "Firenze", "Toscana gourmet", "Matrimoni,Incentive"],
  ["Osteria Santa Croce", "Firenze", "Toscana, Pizza", "Studenti,Famiglie"],
  ["Cicchetteria al Ponte", "Venezia", "Veneziana, Cicchetti", "Adulti,Gruppi turistici"],
  ["Trattoria Fondamenta Nove", "Venezia", "Pesce, Veneziana", "Gruppi turistici,Crocieristi"],
  ["Pizzeria Rialto", "Venezia", "Pizza, Italiana", "Studenti,Famiglie"],
  ["'O Vicolo dei Tribunali", "Napoli", "Napoletana, Pizza", "Studenti,Gruppi turistici"],
  ["Trattoria Spaccanapoli", "Napoli", "Napoletana, Pesce", "Adulti,Crocieristi"],
  ["Lungomare Santa Lucia", "Napoli", "Pesce", "Incentive,Adulti"],
  ["Navigli Bistrot", "Milano", "Milanese, Italiana", "Cene aziendali,Adulti"],
  ["Osteria del Duomo", "Milano", "Lombarda", "Gruppi turistici,Studenti"],
  ["Giardino degli Aranci", "Sorrento", "Campana, Pesce", "Crocieristi,Matrimoni"],
  ["Terrazza sul Golfo", "Sorrento", "Mediterranea", "Gruppi turistici,Incentive"],
  ["Locanda del Pellegrino", "Assisi", "Umbra", "Pellegrini,Gruppi parrocchiali"],
  ["Trattoria San Francesco", "Assisi", "Umbra, Tartufo", "Pellegrini,Studenti"],
];

const ORGANIZERS: [string, OrganizerType, string][] = [
  ["Passaporto Viaggi", "TOUR_OPERATOR", "Bologna"],
  ["Iberia Group Tours", "TOUR_OPERATOR", "Madrid"],
  ["Voyages Lumière", "TOUR_OPERATOR", "Lyon"],
  ["Northern Star Travel", "TOUR_OPERATOR", "Dublin"],
  ["Bella Italia Incoming", "TOUR_OPERATOR", "Roma"],
  ["Pilgrim Ways", "TOUR_OPERATOR", "Kraków"],
  ["Viaggi del Sole", "AGENZIA", "Torino"],
  ["Rotta Nord Agenzia", "AGENZIA", "Verona"],
  ["Liceo Scientifico G. Galilei", "SCUOLA", "Perugia"],
  ["Istituto Comprensivo Manzoni", "SCUOLA", "Bergamo"],
  ["Collegio San Giuseppe", "SCUOLA", "Torino"],
  ["Parrocchia Santa Maria Assunta", "PARROCCHIA", "Brescia"],
  ["Parrocchia San Lorenzo", "PARROCCHIA", "Lecce"],
  ["Diocesi pellegrinaggi Nord", "PARROCCHIA", "Udine"],
  ["Tecnoservizi Spa", "AZIENDA", "Milano"],
  ["Gruppo Assicurativo Alfa", "AZIENDA", "Roma"],
  ["Università di Studi Esteri", "UNIVERSITA", "Siena"],
  ["Associazione Amici del Cammino", "ASSOCIAZIONE", "Ancona"],
  ["Roma Walking Guides", "GUIDA", "Roma"],
  ["Eventi d'Autore", "EVENTI", "Napoli"],
];

const FIRST = ["Giulia", "Marco", "Sofia", "Luca", "Chiara", "Andrea", "Elena", "Paolo", "Laura", "Davide", "Anna", "Javier", "Claire", "Seán", "Marta", "Pierre"];
const LAST = ["Rossi", "Bianchi", "Conti", "Greco", "Ferri", "Gallo", "Romano", "Costa", "García", "Dubois", "Murphy", "Nowak", "Marino", "Leone"];
const GROUPS = ["Gruppo turistico", "Studenti", "Adulti", "Pellegrini", "Crocieristi", "Aziendale / Incentive", "Gruppo misto"];

const MENU_TEMPLATES = [
  { name: "Menu Studenti", price: [15, 20], min: 15, max: 120, free: 25, audience: "Studenti", courses: [["Primo", ["Pasta al pomodoro", "Lasagna"]], ["Secondo", ["Cotoletta con patate"]], ["Dolce", ["Gelato"]], ["Bevande", ["Acqua e bibita"]]] },
  { name: "Menu Pizza", price: [16, 22], min: 10, max: 150, free: 20, audience: "Gruppi", courses: [["Antipasto", ["Bruschette", "Supplì"]], ["Pizza", ["Margherita o a scelta tra 3 gusti"]], ["Dolce", ["Tiramisù"]], ["Bevande", ["Acqua e bibita o birra"]]] },
  { name: "Menu Tradizione", price: [25, 32], min: 10, max: 100, free: 20, audience: "Adulti", courses: [["Antipasto", ["Tagliere di salumi e formaggi locali"]], ["Primo", ["Carbonara", "Cacio e pepe"]], ["Secondo", ["Saltimbocca con contorno"]], ["Dolce", ["Dolce della casa"]], ["Bevande", ["Acqua, 1/4 vino, caffè"]]] },
  { name: "Menu Pellegrini", price: [18, 24], min: 20, max: 150, free: 25, audience: "Pellegrini", courses: [["Primo", ["Penne all'arrabbiata"]], ["Secondo", ["Pollo arrosto con patate"]], ["Dolce", ["Frutta di stagione"]], ["Bevande", ["Acqua e vino della casa"]]] },
  { name: "Menu Degustazione", price: [42, 60], min: 8, max: 60, free: null, audience: "Incentive", courses: [["Benvenuto", ["Calice di bollicine e finger food"]], ["Antipasto", ["Crudo di pesce del giorno"]], ["Primo", ["Risotto mantecato agli agrumi"]], ["Secondo", ["Filetto di spigola, verdure di stagione"]], ["Dolce", ["Semifreddo al pistacchio"]], ["Bevande", ["Vini in abbinamento"]]] },
] as const;


// ───────────── Sorgente ristoranti: dati pubblici importati dal sito attuale, oppure demo inventata

type Source = {
  name: string; city: string; citySlug: string; province: string | null; address: string | null; zip: string | null;
  lat: number | null; lng: number | null; cuisine: string | null; tags: string | null; tagline: string | null; description: string | null;
  openingHours: string | null; capacity: number | null; cover: string | null; images: string[]; featured: boolean;
  legacyId: number | null; sourceUrl: string | null; serviceKinds: string[];
  menus: { name: string; courses: { course: string; items: string[] }[]; price: number; min: number; max: number; free: number | null; audience: string | null; description?: string | null }[];
};

const SERVICE_HOURS: Record<string, [string, string]> = {
  Colazione: ["08:00", "10:30"], Pranzo: ["12:00", "15:00"], Aperitivo: ["18:00", "20:00"], Apericena: ["19:00", "22:00"],
  Cena: ["19:00", "23:00"], "Dopo cena": ["21:30", "23:59"], "Cooking class": ["10:00", "13:00"],
};
const CUISINE_TAGS = ["Carne", "Pesce", "Pizza", "Cucina italiana", "Cucina tipica regionale", "Romana", "Toscana", "Napoletana", "Veneziana", "Vegetariana", "Gourmet", "Sushi", "Cinese", "Indiana", "Americana", "Steakhouse", "Wine Bar", "Pub", "Birreria"];
const DATA_FILE = join(__dirname, "data", "ristoranti-pubblici.json");

function menuFromName(name: string, courses: string[]) {
  const n = name.toLowerCase();
  const kind = /student|ragazz|bambin|kid/.test(n) ? "studenti" : /pizza/.test(n) ? "pizza" : /degust|gourmet|chef|gala|capodanno|vip/.test(n) ? "top" : /pellegrin/.test(n) ? "pellegrini" : /aperitiv|apericena|cocktail|drink/.test(n) ? "aperitivo" : /colazion|breakfast/.test(n) ? "colazione" : "adulti";
  const conf = {
    studenti: { price: [14, 20], min: 15, max: 150, free: 25, audience: "Studenti" },
    pizza: { price: [15, 22], min: 10, max: 150, free: 20, audience: "Gruppi" },
    top: { price: [45, 70], min: 8, max: 80, free: null, audience: "Incentive" },
    pellegrini: { price: [17, 24], min: 20, max: 150, free: 25, audience: "Pellegrini" },
    aperitivo: { price: [12, 20], min: 10, max: 150, free: null, audience: "Adulti" },
    colazione: { price: [8, 14], min: 10, max: 150, free: 25, audience: "Gruppi" },
    adulti: { price: [24, 38], min: 10, max: 120, free: 20, audience: "Adulti" },
  }[kind]!;
  return {
    name: name.replace(/^Men[uù]\s/i, "Menu "),
    courses: courses.length ? [{ course: "Comprende", items: courses }] : [],
    price: int(conf.price[0]!, conf.price[1]!),
    min: conf.min, max: conf.max, free: conf.free, audience: conf.audience,
  };
}

function loadSources(): Source[] {
  if (existsSync(DATA_FILE)) {
    const data = JSON.parse(readFileSync(DATA_FILE, "utf8")) as {
      restaurants: { name: string; city: string; citySlug: string; province: string | null; address: string | null; zip: string | null; tags: string[]; description: string | null; services: string | null; openingHours: string | null; menus: { name: string; courses: string[] }[]; cover: string | null; images: string[]; lat: number | null; lng: number | null; legacyId: number | null; sourceUrl: string }[];
    };
    console.log(`  uso ${data.restaurants.length} ristoranti dal sito pubblico (foto collegate, non scaricate)`);
    const top = new Set(["Royal Art Cafe", "Hostaria Al Gladiatore", "Hostaria Isidoro", "Romantica", "Propaganda", "Antica Osteria Croce", "Venerina", "Il Giardino 1909", "Vecchia Firenze", "Buca Niccolini"]);
    return data.restaurants.map((r) => {
      const cap = Number(r.description?.match(/(\d{2,4})\s*(?:posti|coperti|persone)/i)?.[1]);
      const firstSentence = r.description?.split(/(?<=[.!?])\s/)[0] ?? null;
      const kinds = (r.services ?? "Pranzo - Cena").split(/\s*-\s*/).map((x) => x.trim()).filter((x) => SERVICE_HOURS[x]);
      const menus = r.menus.length ? r.menus.slice(0, 6).map((m) => menuFromName(m.name, m.courses)) : MENU_TEMPLATES.slice(0, 3).map((t) => ({ name: t.name, courses: t.courses.map(([course, items]) => ({ course, items: [...items] })), price: int(t.price[0], t.price[1]), min: t.min, max: t.max, free: t.free, audience: t.audience }));
      return {
        name: r.name.trim(), city: titleCase(r.city), citySlug: r.citySlug, province: r.province, address: r.address, zip: r.zip, lat: r.lat, lng: r.lng,
        cuisine: r.tags.filter((t) => CUISINE_TAGS.includes(t)).join(", ") || null,
        tags: r.tags.filter((t) => !CUISINE_TAGS.includes(t)).join(", ") || null,
        tagline: firstSentence && firstSentence.length <= 220 ? firstSentence : null,
        description: r.description, openingHours: r.openingHours,
        capacity: cap >= 20 && cap <= 2000 ? cap : null,
        cover: r.cover, images: r.images, featured: top.has(r.name.trim()),
        legacyId: r.legacyId, sourceUrl: r.sourceUrl,
        serviceKinds: kinds.length ? kinds : ["Pranzo", "Cena"],
        menus,
      };
    });
  }
  return RESTAURANTS.map(([name, city, cuisine, tags], i) => {
    const c = CITIES.find((x) => x[0] === city)!;
    return {
      name, city, citySlug: slug(city), province: c[1],
      address: `${pick(["Via", "Piazza", "Vicolo", "Largo"])} ${pick(["dei Fiori", "Garibaldi", "San Marco", "del Corso", "Mazzini"])} ${int(1, 120)}`,
      zip: String(int(10000, 99999)), lat: c[2], lng: c[3], cuisine, tags,
      tagline: "Accoglienza calorosa e piatti tipici, anche per gruppi numerosi.",
      description: "Un locale storico che accoglie gruppi da oltre vent'anni, con menu dedicati e alternative per celiaci, vegetariani e bambini.",
      openingHours: "Tutti i giorni 12:00–15:00 e 19:00–23:00", capacity: null, cover: null, images: [], featured: i % 4 === 0,
      legacyId: null, sourceUrl: null, serviceKinds: ["Pranzo", "Cena"],
      menus: [...MENU_TEMPLATES].slice(0, 3).map((t) => ({ name: t.name, courses: t.courses.map(([course, items]) => ({ course, items: [...items] })), price: int(t.price[0], t.price[1]), min: t.min, max: t.max, free: t.free, audience: t.audience })),
    };
  });
}

function loadCities(): { slug: string; name: string; image: string | null; hero: string | null }[] {
  if (!existsSync(DATA_FILE)) return CITIES.map(([name]) => ({ slug: slug(name), name, image: null, hero: null }));
  return (JSON.parse(readFileSync(DATA_FILE, "utf8")) as { cities: { slug: string; name: string; image: string | null; hero: string | null }[] }).cities;
}

/** "ROMA" → "Roma", "san giovanni" → "San Giovanni" (i dati del vecchio sito non sono uniformi) */
function titleCase(raw: string) {
  const s = raw.replace(/\(\s*\)/g, "").trim();
  if (/^rome$/i.test(s)) return "Roma";
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s.replace(/\b(In|Di|Del|Della|Sul)\b(?=\s)/g, (w) => w.toLowerCase());
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\b(Di|Del|Della|In|Sul)\b/g, (w) => w.toLowerCase());
}

const usedSlugs = new Set<string>();
async function uniqueSlug(base: string) {
  let s = base;
  for (let k = 2; usedSlugs.has(s); k++) s = `${base}-${k}`;
  usedSlugs.add(s);
  return s;
}

async function main() {
  console.log("Pulizia…");
  for (const t of ["city", "message", "event", "payment", "quoteOption", "booking", "inquiry", "menuService", "menu", "serviceSlot", "room", "favorite", "agentPayout", "user", "organization", "counter", "setting"] as const) {
    // @ts-expect-error accesso dinamico ai delegate
    await db[t].deleteMany();
  }

  const pw = await bcrypt.hash("forgroups2026", 11);

  console.log("Staff e agenti…");
  const staffNames = [
    ["Carmine", "carmine@forgroups.demo"],
    ["Federico", "federico@forgroups.demo"],
    ["Roberta", "roberta@forgroups.demo"],
    ["Marco", "marco@forgroups.demo"],
  ];
  const staff = [];
  for (const [name, email] of staffNames) {
    staff.push(await db.user.create({ data: { name: name!, email: email!, passwordHash: pw, role: "ADMIN", status: "ACTIVE" } }));
  }
  const agents = [];
  for (const [name, i] of [["Alessia Moretti", 1], ["Stefano Rinaldi", 2], ["Valeria Fontana", 3]] as const) {
    agents.push(await db.user.create({ data: { name, email: `agente${i}@forgroups.demo`, passwordHash: pw, role: "AGENT", status: "ACTIVE", agentShare: 2000 } }));
  }

  console.log("Ristoranti…");
  const restaurants = [];
  const sources = loadSources();
  for (const [i, src] of sources.entries()) {
    const capacity = src.capacity ?? pick([60, 80, 100, 120, 150, 200]);
    const r = await db.organization.create({
      data: {
        kind: "RESTAURANT",
        status: "ACTIVE",
        name: src.name,
        slug: await uniqueSlug(slug(`${src.name}-${src.city}`)),
        legacyId: src.legacyId,
        sourceUrl: src.sourceUrl,
        city: src.city,
        citySlug: src.citySlug,
        province: src.province,
        address: src.address,
        zip: src.zip,
        lat: src.lat,
        lng: src.lng,
        email: `info@${slug(src.name)}.demo`,
        phone: `+39 0${int(10, 99)} ${int(100000, 999999)}`,
        billingName: `${src.name} S.r.l.`,
        vatNumber: String(int(10000000000, 99999999999)),
        sdiCode: "M5UXCR1",
        cuisine: src.cuisine,
        tags: src.tags,
        tagline: src.tagline,
        description: src.description,
        coverImage: src.cover,
        images: src.images.length ? JSON.stringify(src.images) : null,
        openingHours: src.openingHours,
        maxCapacity: capacity,
        featured: src.featured,
        commissionRate: pick([1000, 1000, 1200, 1500]),
        agentId: i % 3 === 0 ? agents[i % agents.length]!.id : null,
        contractDate: dayUTC(-int(100, 900)),
        acceptsOnlinePayment: true,
        stripeTransfersActive: i % 5 !== 4, // in demo: alcuni non ancora collegati a Stripe
        stripeAccountId: i % 5 !== 4 ? `acct_demo_${i}` : null,
        defaultPaymentMode: i % 3 === 0 ? "ONLINE_DEPOSIT" : "ONLINE_FULL",
        defaultDepositPercent: 30,
        members: {
          create: { name: `${pick(FIRST)} ${pick(LAST)}`, email: `ristorante${i + 1}@forgroups.demo`, passwordHash: pw, role: "RESTAURANT", status: "ACTIVE" },
        },
      },
    });
    const main = await db.room.create({ data: { restaurantId: r.id, name: "Sala principale", capacity: Math.max(20, Math.round(capacity * 0.6)) } });
    const second = await db.room.create({ data: { restaurantId: r.id, name: pick(["Terrazza", "Sala del camino", "Giardino", "Sala volte"]), capacity: Math.max(15, Math.round(capacity * 0.4)) } });
    const services = [];
    for (const room of [main, second]) {
      for (const kind of src.serviceKinds) {
        const [startTime, endTime] = SERVICE_HOURS[kind] ?? ["12:00", "15:00"];
        services.push(await db.serviceSlot.create({ data: { restaurantId: r.id, roomId: room.id, kind, startTime, endTime, weekdays: kind === "Cena" && i % 2 ? "234567" : "1234567", leadTimeHours: 24 } }));
      }
    }
    for (const [pos, m] of src.menus.entries()) {
      await db.menu.create({
        data: {
          restaurantId: r.id,
          name: m.name,
          description: m.description ?? null,
          courses: JSON.stringify(m.courses),
          priceCents: m.price * 100,
          minPax: m.min,
          maxPax: Math.min(m.max, capacity),
          freeEvery: m.free,
          audience: m.audience,
          position: pos,
          services: { create: services.map((sv) => ({ serviceId: sv.id })) },
        },
      });
    }
    restaurants.push(r);
  }
  // un ristorante in attesa di approvazione, per la demo
  await db.organization.update({ where: { id: restaurants[restaurants.length - 1]!.id }, data: { status: "PENDING" } });
  restaurants[restaurants.length - 1]!.status = "PENDING";

  console.log("Città…");
  for (const c of loadCities()) {
    await db.city.create({ data: { ...c, position: restaurants.filter((r) => r.citySlug === c.slug).length ? 100 - Math.min(99, restaurants.filter((r) => r.citySlug === c.slug).length) : 200 } });
  }

  console.log("Organizzatori…");
  const organizers = [];
  for (const [i, [name, type, city]] of ORGANIZERS.entries()) {
    const person = `${pick(FIRST)} ${pick(LAST)}`;
    organizers.push(
      await db.organization.create({
        data: {
          kind: "ORGANIZER",
          organizerType: type,
          status: i === ORGANIZERS.length - 1 ? "PENDING" : "ACTIVE",
          name,
          slug: slug(`${name}-${city}`),
          city,
          citySlug: slug(city),
          email: `booking@${slug(name)}.demo`,
          phone: `+39 3${int(10, 99)} ${int(1000000, 9999999)}`,
          members: {
            create: {
              name: person,
              email: i === 0 ? "agenzia@forgroups.demo" : `${slug(person)}.${i}@${slug(name)}.demo`,
              phone: `+39 3${int(10, 99)} ${int(1000000, 9999999)}`,
              passwordHash: pw,
              role: "ORGANIZER",
              status: i === ORGANIZERS.length - 1 ? "PENDING" : "ACTIVE",
            },
          },
        },
        include: { members: true },
      }),
    );
  }

  console.log("Prenotazioni…");
  const active = restaurants.filter((r) => r.status === "ACTIVE");
  let code = 9800;
  for (let k = 0; k < 520; k++) {
    const r = pick(active);
    const org = pick(organizers.filter((o) => o.status === "ACTIVE"));
    const offset = int(-330, 60);
    const date = dayUTC(offset);
    const menu = pick(await db.menu.findMany({ where: { restaurantId: r.id } }));
    const service = pick(await db.serviceSlot.findMany({ where: { restaurantId: r.id } }));
    const pax = Math.min(menu.maxPax, Math.max(menu.minPax, int(12, 60)));
    const free = menu.freeEvery ? Math.floor(pax / (menu.freeEvery + 1)) : 0;
    const total = (pax - free) * menu.priceCents;
    const commission = Math.round((total * r.commissionRate) / 10000);
    let status: BookingStatus;
    if (offset < -1) status = rnd() < 0.9 ? "COMPLETED" : pick(["CANCELLED", "NO_SHOW"] as const);
    else status = rnd() < 0.72 ? "CONFIRMED" : rnd() < 0.85 ? "REQUESTED" : "CANCELLED";
    const mode: PaymentMode = r.stripeTransfersActive ? r.defaultPaymentMode : "ON_SITE";
    let paid = 0;
    if (status === "COMPLETED") paid = total;
    else if (status === "CONFIRMED") paid = rnd() < 0.5 ? (mode === "ONLINE_DEPOSIT" ? Math.round(total * 0.3) : total) : 0;
    const created = new Date(Math.min(date.getTime() - int(5, 60) * 86400000, Date.now() - int(1, 96) * 3600000));
    const member = org.members[0]!;
    const b = await db.booking.create({
      data: {
        code: `FG-${code++}`,
        status,
        restaurantId: r.id,
        organizerId: org.id,
        createdById: member.id,
        contactName: member.name,
        contactEmail: member.email,
        contactPhone: member.phone,
        groupName: `${pick(["Tour", "Gita", "Pellegrinaggio", "Viaggio", "Incentive"])} ${pick(["primavera", "autunno", "Roma classica", "Italia del Nord", "classi terze", "anniversario"])}`,
        groupType: pick(GROUPS),
        groupLeader: `${pick(FIRST)} ${pick(LAST)}`,
        groupLeaderPhone: `+39 3${int(10, 99)} ${int(1000000, 9999999)}`,
        date,
        time: service.startTime === "12:00" ? pick(["12:00", "12:30", "13:00"]) : pick(["19:00", "19:30", "20:00", "20:30"]),
        serviceId: service.id,
        roomId: service.roomId,
        menuId: menu.id,
        pax,
        freePax: free,
        priceCents: menu.priceCents,
        totalCents: total,
        commissionRate: r.commissionRate,
        commissionCents: commission,
        paymentMode: mode,
        depositPercent: mode === "ONLINE_DEPOSIT" ? 30 : null,
        paymentStatus: paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        paidCents: paid,
        dietaryNotes: rnd() < 0.3 ? pick(["2 celiaci", "3 vegetariani, 1 allergia frutta secca", "1 vegano"]) : null,
        confirmedAt: status !== "REQUESTED" ? new Date(created.getTime() + 86400000) : null,
        createdAt: created,
      },
    });
    if (paid > 0 && mode !== "ON_SITE") {
      await db.payment.create({
        data: { bookingId: b.id, kind: paid >= total ? "full" : "deposit", amountCents: paid, applicationFeeCents: Math.min(commission, paid), status: "SUCCEEDED", paidAt: new Date(created.getTime() + 2 * 86400000) },
      });
    }
    await db.event.create({ data: { entityType: "booking", entityId: b.id, action: "created", summary: `Prenotazione creata: ${pax} persone, ${menu.name}`, createdAt: created } });
    if (status === "REQUESTED" && rnd() < 0.5) {
      await db.message.create({ data: { bookingId: b.id, authorId: member.id, body: "Buongiorno, possiamo arrivare 15 minuti prima? Il pullman ci lascia alle 12:15. Grazie!", createdAt: new Date() } });
    }
  }
  await db.counter.create({ data: { name: "booking", value: code } });

  console.log("Richieste…");
  const STAGES: InquiryStage[] = ["NEW", "NEW", "NEW", "QUALIFIED", "QUALIFIED", "QUOTED", "QUOTED", "WON", "LOST"];
  const MESSAGES = [
    "Buongiorno, siamo un gruppo di 45 studenti con 4 docenti, cerchiamo un pranzo veloce vicino al Colosseo. Budget 18€ a persona.",
    "Hello, we are a group of 32 adults from Ireland visiting Rome in spring. Looking for a traditional dinner with wine. Two vegetarians.",
    "Bonjour, nous organisons un pèlerinage pour 60 personnes à Assise, déjeuner simple et rapide svp.",
    "Hola, grupo de 28 personas, cena en Florencia con menú toscano, ¿tienen disponibilidad?",
    "Cena aziendale per 80 persone con aperitivo in terrazza, budget 60€ a testa, serve anche un microfono.",
  ];
  let rq = 3600;
  for (let k = 0; k < 34; k++) {
    const stage = pick(STAGES);
    const city = pick(CITIES)[0];
    const org = rnd() < 0.6 ? pick(organizers) : null;
    const created = new Date(Date.now() - int(0, 40) * 86400000 - int(0, 86400000));
    const inq = await db.inquiry.create({
      data: {
        code: `RQ-${rq++}`,
        stage,
        source: pick(["website", "website", "email", "phone", "portal"]),
        organizerId: org?.id,
        contactName: `${pick(FIRST)} ${pick(LAST)}`,
        company: org?.name ?? null,
        email: `contatto${k}@example.com`,
        phone: rnd() < 0.6 ? `+39 3${int(10, 99)} ${int(1000000, 9999999)}` : null,
        language: pick(["it", "it", "en", "fr", "es"]),
        city,
        date: dayUTC(int(5, 120)),
        pax: int(15, 90),
        groupType: pick(GROUPS),
        serviceKind: pick(["Pranzo", "Cena"]),
        budgetCents: rnd() < 0.6 ? int(15, 55) * 100 : null,
        message: pick(MESSAGES),
        assigneeId: stage === "NEW" ? null : pick(staff).id,
        lostReason: stage === "LOST" ? pick(["Prezzo troppo alto", "Data non disponibile", "Il cliente ha annullato il viaggio"]) : null,
        createdAt: created,
      },
    });
    if (stage === "QUOTED" || stage === "WON") {
      const options = active.filter((r) => r.city === city).slice(0, 2);
      for (const r of options) {
        const m = await db.menu.findFirst({ where: { restaurantId: r.id }, orderBy: { priceCents: "asc" } });
        if (m) await db.quoteOption.create({ data: { inquiryId: inq.id, restaurantId: r.id, menuId: m.id, priceCents: m.priceCents, note: "Sala riservata per il gruppo" } });
      }
    }
  }
  await db.counter.create({ data: { name: "inquiry", value: rq } });
  console.log("Fatto ✔  Accesso staff: carmine@forgroups.demo / forgroups2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
