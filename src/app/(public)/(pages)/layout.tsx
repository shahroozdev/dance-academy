import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeaderContainer } from "@/components/public/site-header-container";

// Every page except the home page: the same transparent header as home (it floats over the
// page's opening band, which leaves room for it), then the page and the footer.
export default function InnerPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeaderContainer />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
