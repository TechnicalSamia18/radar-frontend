"use client";
import { DataGate, PageHeader } from "@/components/data-gate";
import { ProfileForm } from "./profile-form";

export function ProfileView() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader label="Profile" title="Your resume and preferences">
        Radar uses this to score each opening. Your resume file isn&apos;t stored: only the skills you confirm.
      </PageHeader>
      {/* The form takes the saved profile as its starting values when the page opens. */}
      <DataGate>{(state) => <ProfileForm initial={state.profile} />}</DataGate>
    </div>
  );
}
