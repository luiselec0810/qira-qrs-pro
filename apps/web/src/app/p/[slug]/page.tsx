import { notFound } from "next/navigation";
import type { PublicLanding } from "@qira/shared";
import { serverApi } from "@/lib/server-api";
import { VCardView } from "@/components/landing/vcard-view";
import { HubView } from "@/components/landing/hub-view";

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let landing: PublicLanding;
  try {
    landing = await serverApi<PublicLanding>(`/api/public/landings/${encodeURIComponent(slug)}`, {
      authenticated: false,
    });
  } catch {
    notFound();
  }

  if (landing.landingData.kind === "vcard") {
    return <VCardView slug={landing.slug} vcard={landing.landingData.vcard} />;
  }

  if (landing.landingData.kind === "hub") {
    return <HubView hub={landing.landingData.hub} />;
  }

  notFound();
}
