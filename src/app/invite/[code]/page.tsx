import InviteClient from "./client";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { code } = await params;
  const { from } = await searchParams;
  return <InviteClient code={code} fromName={from || null} />;
}
