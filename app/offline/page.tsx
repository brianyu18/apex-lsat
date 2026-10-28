import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardTitle>You&apos;re offline</CardTitle>
      <CardDescription>Lessons you&apos;ve opened before and the offline drill pack still work. Attempts you make now are queued and sync when you&apos;re back online.</CardDescription>
      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link href="/drill/session?s=%7B%22count%22%3A10%7D">Offline drill</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/learn">Lessons</Link>
        </Button>
      </div>
    </Card>
  );
}
