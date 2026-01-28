import Link from "next/link";

export default function AfventerPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Afventer godkendelse</h1>
      <p className="mt-2 text-zinc-600">
        Din konto er oprettet, men afventer godkendelse.
      </p>
      <p className="mt-4 text-sm text-zinc-600">
        Hvis du er <strong>leder</strong>, skal en admin godkende dig. Hvis du er
        <strong> spiller/supporter</strong>, skal en leder på dit hold godkende dig.
      </p>

      <div className="mt-6">
        <Link className="underline" href="/login">
          Tilbage til login
        </Link>
      </div>
    </main>
  );
}
