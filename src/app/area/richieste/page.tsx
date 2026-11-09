import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { InquiryForm } from "@/components/inquiry-form";
import { day, money } from "@/lib/format";
import { INQUIRY_STAGE } from "@/lib/labels";

export default async function AreaRequests() {
  const user = await requireUser(["ORGANIZER"]);
  const list = await db.inquiry.findMany({
    where: { organizerId: user.organizationId ?? "-" },
    orderBy: { createdAt: "desc" },
    include: { quoteOptions: { include: { restaurant: true, menu: true } }, booking: true },
  });
  const label = (s: keyof typeof INQUIRY_STAGE) => (s === "NEW" || s === "QUALIFIED" ? { label: "In lavorazione", tone: "amber" as const } : s === "QUOTED" ? { label: "Proposta pronta", tone: "blue" as const } : s === "WON" ? { label: "Prenotata", tone: "green" as const } : { label: "Chiusa", tone: "gray" as const });
  return (
    <>
      <PageHeader title="Preventivi" subtitle="Raccontaci il gruppo: troviamo noi il ristorante giusto e ti mandiamo le proposte." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="self-start p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">Nuova richiesta</h2>
          <InquiryForm defaults={{ contactName: user.name, email: user.email, phone: user.phone ?? undefined, company: user.organization?.name }} />
        </Card>
        <div className="space-y-4 xl:col-span-3">
          {list.length === 0 && <p className="text-sm text-ink-500">Nessuna richiesta inviata finora.</p>}
          {list.map((q) => (
            <Card key={q.id}>
              <CardHeader
                title={`${q.code} · ${[q.city, q.pax && `${q.pax} persone`, q.date && day(q.date)].filter(Boolean).join(" · ")}`}
                subtitle={q.message?.slice(0, 140)}
                action={<Badge tone={label(q.stage).tone}>{label(q.stage).label}</Badge>}
              />
              {q.quoteOptions.length > 0 && q.stage !== "LOST" && (
                <ul className="divide-y divide-ink-100 text-sm">
                  {q.quoteOptions.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <a href={`/ristoranti/${o.restaurant.slug}${q.date ? `?data=${q.date.toISOString().slice(0, 10)}&persone=${q.pax ?? ""}` : ""}`} className="font-medium hover:underline">{o.restaurant.name}</a>
                        <div className="text-xs text-ink-500">{o.menu?.name} {o.note ? `· ${o.note}` : ""}</div>
                      </div>
                      <span className="font-semibold tabular-nums">{money(o.priceCents)} p.p.</span>
                    </li>
                  ))}
                </ul>
              )}
              {q.booking && <p className="px-5 py-3 text-sm"><a href={`/area/prenotazioni/${q.booking.code}`} className="font-medium text-brand-700 hover:underline">Vai alla prenotazione {q.booking.code} →</a></p>}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
