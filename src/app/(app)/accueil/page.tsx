export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Bonjour</h1>
      {email === "verifie" && (
        <p role="status" className="mt-3 text-sm text-positive">
          Email confirmé.
        </p>
      )}
      <p className="mt-6 text-sm text-fg-2">Ton tableau de bord arrive bientôt.</p>
    </>
  );
}
