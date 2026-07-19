import { redirect } from "next/navigation";

// La landing marketing arrive au Sprint 4 — en attendant, le produit.
export default function Home() {
  redirect("/app");
}
