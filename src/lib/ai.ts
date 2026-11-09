import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { GROUP_TYPES, SERVICE_KINDS } from "./labels";

/**
 * "Preventivo in un minuto": incolli l'email (anche in inglese, francese, spagnolo…)
 * e Claude estrae i dati della richiesta in forma strutturata.
 */

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const ExtractedInquiry = z.object({
  contactName: z.string().describe("Nome e cognome di chi scrive, o stringa vuota"),
  company: z.string().describe("Agenzia, scuola, parrocchia o azienda, o stringa vuota"),
  email: z.string().describe("Email del mittente se presente, altrimenti stringa vuota"),
  phone: z.string().describe("Telefono se presente, altrimenti stringa vuota"),
  language: z.string().describe("Lingua dell'email, codice ISO a 2 lettere (it, en, fr, es, de…)"),
  city: z.string().describe("Città del servizio in italiano (Roma, Firenze…), o stringa vuota"),
  date: z.string().describe("Data del servizio in formato YYYY-MM-DD, o stringa vuota se non indicata"),
  time: z.string().describe("Orario richiesto HH:MM, o stringa vuota"),
  pax: z.number().int().describe("Numero totale di persone, 0 se non indicato"),
  groupType: z.string().describe(`Tipo di gruppo, uno tra: ${GROUP_TYPES.join(", ")}`),
  serviceKind: z.string().describe(`Servizio, uno tra: ${SERVICE_KINDS.join(", ")}`),
  budgetPerPersonEur: z.number().describe("Budget a persona in euro, 0 se non indicato"),
  dietary: z.string().describe("Esigenze alimentari (celiaci, vegetariani, allergie…), o stringa vuota"),
  summary: z.string().describe("Riassunto operativo in italiano, massimo 2 frasi"),
  missing: z.array(z.string()).describe("Informazioni mancanti da chiedere al cliente, in italiano"),
  replyDraft: z.string().describe("Bozza di risposta cortese nella lingua del cliente, firmata 'Il team ForGroups'"),
});

export type ExtractedInquiry = z.infer<typeof ExtractedInquiry>;

export async function extractInquiry(emailText: string, today: string): Promise<ExtractedInquiry> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractedInquiry) },
    // In caso di rifiuto dei filtri di sicurezza l'API riprova automaticamente con il modello di riserva
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "Sei l'assistente commerciale di ForGroups, piattaforma italiana che prenota ristoranti per gruppi " +
      "(tour operator, scuole, parrocchie, aziende). Estrai i dati della richiesta dall'email. " +
      `Oggi è ${today}: risolvi date relative ("il 12 maggio", "next Friday") nell'anno corretto. ` +
      "Non inventare dati: se un campo non c'è lascialo vuoto e aggiungilo a 'missing'.",
    messages: [{ role: "user", content: `Email ricevuta:\n\n${emailText}` }],
  });

  if (response.stop_reason === "refusal") throw new Error("La richiesta non può essere analizzata automaticamente.");
  if (!response.parsed_output) throw new Error("Analisi non riuscita, riprova o compila a mano.");
  return response.parsed_output;
}
