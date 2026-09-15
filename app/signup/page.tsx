import AuthShell from "../auth-shell";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell title="Créer un compte">
      <SignupForm />
    </AuthShell>
  );
}
