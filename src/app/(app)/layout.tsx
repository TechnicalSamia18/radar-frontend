// Shared layout for the app pages. "(app)" is a route group: it groups these
// pages under one layout without adding "/app" to the URL.
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* First thing keyboard users reach: jump past the navigation. */}
      <a href="#main" className="label-caps sr-only z-50 bg-beige px-4 py-3 text-evening focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AppNav />
      <main id="main" tabIndex={-1} className="flex-1 bg-sand px-5 py-8 outline-none sm:px-10">
        {children}
      </main>
    </div>
  );
}
