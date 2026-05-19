// ─── Multi-user-mappning ─────────────────────────────────────────────────────
// Authelia bakom NPM skickar `X-Forwarded-Email` som identifierar användaren.
// Vi slår upp profilen här och returnerar { name, tabs }. Saknad header eller
// okänd email → defaulta till Adam (full åtkomst). Det matchar nuvarande
// dev-flöde där Authelia inte sitter framför.

import type { TabKey } from "@/components/warm/primitives";

export interface UserProfile {
  email: string;
  name: string;
  tabs: TabKey[];
}

const ADAM: UserProfile = {
  email: "adam@inicio.se",
  name: "Adam",
  tabs: ["hem", "lab", "fit", "gard", "mat"],
};

const USERS: Record<string, UserProfile> = {
  [ADAM.email]: ADAM,
  "angelica.mand@outlook.com": {
    email: "angelica.mand@outlook.com",
    name: "Angelica",
    tabs: ["hem", "gard"],
  },
};

export const DEFAULT_USER: UserProfile = ADAM;

export function getUserByEmail(email: string | null | undefined): UserProfile {
  if (!email) return DEFAULT_USER;
  return USERS[email.trim().toLowerCase()] ?? DEFAULT_USER;
}
