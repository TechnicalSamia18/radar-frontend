// Opening detail. The id comes from the URL (?id=…), read in the browser, so
// the page itself can be static. useSearchParams needs a Suspense boundary.
import { Suspense } from "react";
import { OpeningDetail } from "./opening-detail";

export const metadata = { title: "Opening — Radar" };

export default function OpeningDetailPage() {
  return (
    <Suspense fallback={<p role="status" className="text-stormy">Loading…</p>}>
      <OpeningDetail />
    </Suspense>
  );
}
