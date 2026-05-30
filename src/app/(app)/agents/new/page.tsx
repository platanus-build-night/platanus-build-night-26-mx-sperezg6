import { redirect } from "next/navigation";

// Agent creation happens via the dialog on /agents.
export default function NewAgentRedirect() {
  redirect("/agents");
}
