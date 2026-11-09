import type { BookingStatus, InquiryStage, OrganizerType, PaymentMode, PaymentStatus, Role } from "@prisma/client";

export const ORGANIZER_TYPES: Record<OrganizerType, string> = {
  TOUR_OPERATOR: "Tour Operator",
  AGENZIA: "Agenzia di viaggi",
  AZIENDA: "Azienda",
  GUIDA: "Guida turistica",
  SCUOLA: "Scuola",
  UNIVERSITA: "Università",
  PARROCCHIA: "Parrocchia",
  ASSOCIAZIONE: "Associazione",
  WEDDING_PLANNER: "Wedding planner",
  EVENTI: "Organizzazione eventi",
  PRIVATO: "Privato",
};

export const ROLES: Record<Role, string> = {
  ADMIN: "Staff ForGroups",
  ORGANIZER: "Organizzatore",
  RESTAURANT: "Ristoratore",
  AGENT: "Agente",
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Da confermare", tone: "amber" },
  CONFIRMED: { label: "Confermata", tone: "green" },
  DECLINED: { label: "Rifiutata", tone: "red" },
  CANCELLED: { label: "Annullata", tone: "gray" },
  COMPLETED: { label: "Completata", tone: "blue" },
  NO_SHOW: { label: "No show", tone: "red" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Da pagare", tone: "amber" },
  PARTIAL: { label: "Acconto versato", tone: "blue" },
  PAID: { label: "Pagata", tone: "green" },
  REFUNDED: { label: "Rimborsata", tone: "gray" },
};

export const PAYMENT_MODE: Record<PaymentMode, string> = {
  ONLINE_FULL: "Pagamento online anticipato",
  ONLINE_DEPOSIT: "Acconto online + saldo sul posto",
  ON_SITE: "Pagamento sul posto",
  INVOICE: "Bonifico su fattura",
};

export const INQUIRY_STAGE: Record<InquiryStage, { label: string; tone: Tone; hint: string }> = {
  NEW: { label: "Nuove", tone: "violet", hint: "Da prendere in carico" },
  QUALIFIED: { label: "In lavorazione", tone: "amber", hint: "Stiamo cercando la soluzione" },
  QUOTED: { label: "Preventivo inviato", tone: "blue", hint: "In attesa del cliente" },
  WON: { label: "Confermate", tone: "green", hint: "Diventate prenotazioni" },
  LOST: { label: "Perse", tone: "gray", hint: "Non convertite" },
};

export const SERVICE_KINDS = [
  "Colazione",
  "Pranzo",
  "Aperitivo",
  "Apericena",
  "Cena",
  "Dopo cena",
  "Cooking class",
  "Degustazione",
  "Evento aziendale",
  "Capodanno",
];

export const GROUP_TYPES = [
  "Gruppo turistico",
  "Studenti",
  "Adulti",
  "Pellegrini",
  "Crocieristi",
  "Aziendale / Incentive",
  "Matrimonio / Cerimonia",
  "Compleanno / Festa",
  "Famiglie",
  "Gruppo misto",
];

export type Tone = "green" | "amber" | "red" | "blue" | "gray" | "violet";
