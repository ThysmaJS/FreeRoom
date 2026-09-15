import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Créer un compte</h1>
        <SignupForm />
      </div>
    </div>
  );
}
