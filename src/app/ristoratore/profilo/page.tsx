import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";

export default async function RProfilo() {
  const user = await requireUser(["RESTAURANT"]);
  return (
    <>
      <PageHeader title="Account" subtitle={`${user.name} · ${user.email}`} />
      <Card className="max-w-lg">
        <CardHeader title="Password" />
        <div className="p-5"><PasswordForm /></div>
      </Card>
    </>
  );
}
