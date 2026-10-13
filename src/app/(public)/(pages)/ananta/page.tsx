import { notFound, redirect } from "next/navigation";

import { getPublicFestivals } from "@/actions/public-content";

// "Ananta Festival" in the menu always opens the newest published edition; earlier years keep
// their own pages.
export default async function AnantaIndexPage() {
  const [latest] = await getPublicFestivals();
  if (!latest) notFound();
  redirect(`/ananta/${latest.year}`);
}
