import { notFound } from "next/navigation";

// Any URL that is not a real page lands here, so the public site shows its own styled 404.
export default function CatchAll() {
  notFound();
}
