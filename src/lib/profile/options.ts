// Option lists shared by the database schema, server validation and the form.
// Kept dependency-free so client components can import it cheaply.
export const SEEKING = ["internship", "job", "both"] as const;
export const REMOTE_PREFERENCE = ["any", "onsite_ok", "remote_only"] as const;

export const CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Faisalabad",
  "Multan",
  "Hyderabad",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Abbottabad",
] as const;

export const MAX_SKILLS = 60;
