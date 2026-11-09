import { db } from "./db";
import { addDays, todayUTC } from "./format";

/** Giorno della settimana 1=lun … 7=dom per una data a mezzanotte UTC */
export const weekday = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;

export type SlotAvailability = {
  serviceId: string;
  kind: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  capacity: number;
  booked: number;
  free: number;
  open: boolean;
  reason?: string;
};

/** Disponibilità per un ristorante in una data: posti liberi per servizio/sala. */
export async function availabilityFor(restaurantId: string, date: Date): Promise<SlotAvailability[]> {
  const services = await db.serviceSlot.findMany({
    where: { restaurantId, active: true },
    include: { room: true },
    orderBy: { startTime: "asc" },
  });
  const bookings = await db.booking.groupBy({
    by: ["serviceId"],
    where: { restaurantId, date, status: { in: ["REQUESTED", "CONFIRMED"] } },
    _sum: { pax: true },
  });
  const used = new Map(bookings.map((b) => [b.serviceId, b._sum.pax ?? 0]));
  const wd = String(weekday(date));
  const now = new Date();

  return services.map((s) => {
    const booked = used.get(s.id) ?? 0;
    let open = true;
    let reason: string | undefined;
    if (!s.weekdays.includes(wd)) [open, reason] = [false, "Chiuso in questo giorno"];
    else if (s.validFrom && date < s.validFrom) [open, reason] = [false, "Servizio non ancora attivo"];
    else if (s.validTo && date > s.validTo) [open, reason] = [false, "Servizio non più attivo"];
    else {
      const [h, m] = s.startTime.split(":").map(Number);
      const start = new Date(date.getTime() + ((h ?? 0) * 60 + (m ?? 0)) * 60000 - 3600000); // ~ora italiana
      if (start.getTime() - now.getTime() < s.leadTimeHours * 3600000) [open, reason] = [false, `Prenotabile fino a ${s.leadTimeHours}h prima`];
    }
    const free = Math.max(0, s.room.capacity - booked);
    if (open && free === 0) [open, reason] = [false, "Completo"];
    return {
      serviceId: s.id,
      kind: s.kind,
      startTime: s.startTime,
      endTime: s.endTime,
      roomId: s.roomId,
      roomName: s.room.name,
      capacity: s.room.capacity,
      booked,
      free,
      open,
      reason,
    };
  });
}

/** Occupazione per i prossimi N giorni (per il calendario capacità) */
export async function occupancy(restaurantId: string, days = 14) {
  const from = todayUTC();
  const to = addDays(from, days);
  const [services, bookings] = await Promise.all([
    db.serviceSlot.findMany({ where: { restaurantId, active: true }, include: { room: true } }),
    db.booking.findMany({
      where: { restaurantId, date: { gte: from, lt: to }, status: { in: ["REQUESTED", "CONFIRMED"] } },
      select: { date: true, serviceId: true, pax: true },
    }),
  ]);
  return { from, days, services, bookings };
}
