import { ActionForm } from "./action-form";
import { Field } from "./ui";
import { changePasswordAction } from "@/app/actions/users";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} submit="Cambia password">
      <Field label="Password attuale"><input type="password" name="current" required autoComplete="current-password" className="input" /></Field>
      <Field label="Nuova password (min. 8 caratteri)"><input type="password" name="next" required minLength={8} autoComplete="new-password" className="input" /></Field>
    </ActionForm>
  );
}
