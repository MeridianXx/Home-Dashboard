import { redirect } from "next/navigation";

// Root redirect — v2 entry point is /home
export default function RootPage() {
  redirect("/home");
}
