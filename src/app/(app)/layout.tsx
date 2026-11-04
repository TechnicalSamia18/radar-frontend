// Shared layout for the app pages. "(app)" is a route group: it groups these
// pages under one layout without adding "/app" to the URL.
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <main id="main" className="flex-1 bg-sand px-5 py-8 sm:px-10">
        {children}
      </main>
    </div>
  );
}
