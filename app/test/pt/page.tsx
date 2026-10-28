import { PtRunner } from "@/components/test/pt-runner";

export const metadata = { title: "Practice test" };
export const dynamic = "force-dynamic";

export default function PtPage() {
  return <PtRunner />;
}
