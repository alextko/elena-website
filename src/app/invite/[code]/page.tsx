import type { Metadata } from "next";
import InviteClient from "./client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ from?: string }>;
}): Promise<Metadata> {
  const { from } = await searchParams;
  const title = from
    ? `${from} is inviting you to connect on Elena`
    : "You've been invited to connect on Elena";
  const description = "Elena is your personal health assistant. Accept this invite to connect and share health information.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Elena",
      images: [{ url: "https://elena-health.com/images/og-hero.png", width: 2670, height: 1786 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
