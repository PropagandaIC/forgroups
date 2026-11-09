import { PageHeader } from "@/components/ui";
import { AiInquiry } from "@/components/ai-inquiry";
import { aiEnabled } from "@/lib/ai";

export default async function NuovaRichiesta({ searchParams }: { searchParams: Promise<{ manuale?: string }> }) {
  const { manuale } = await searchParams;
  return (
    <>
      <PageHeader title="Nuova richiesta" subtitle="Dall'email al preventivo in un minuto" />
      <AiInquiry aiReady={aiEnabled()} manual={Boolean(manuale)} />
    </>
  );
}
