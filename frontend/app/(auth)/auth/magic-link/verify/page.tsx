import { MagicLinkVerifyClient } from "./magic-link-verify-client";

export default async function MagicLinkVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <MagicLinkVerifyClient token={params.token ?? ""} />;
}
