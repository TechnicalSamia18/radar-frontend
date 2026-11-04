// Profile page. The page itself is static; the form is a client component
// that reads and writes the profile in this browser.
import { ProfileView } from "./profile-view";

export const metadata = { title: "Profile — Radar" };

export default function ProfilePage() {
  return <ProfileView />;
}
