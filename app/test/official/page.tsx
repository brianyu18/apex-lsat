import Link from "next/link";
import { format, parseISO } from "date-fns";
import { officialTrack } from "@/lib/data/official";
import { LAWHUB_URL } from "@/lib/planner/official-track";
import { Badge, Card, CardDescription, CardTitle, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { savePtsAction } from "./actions";

export const metadata = { title: "Official PrepTests" };
export const dynamic = "force-dynamic";

function compress(list: number[]) {
  const out: string[] = [];
  for (let i = 0; i < list.length; ) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    out.push(j > i + 1 ? `${list[i]}-${list[j]}` : j === i + 1 ? `${list[i]}, ${list[j]}` : String(list[i]));
    i = j + 1;
  }
  return out.join(", ");
}

export default async function OfficialPage() {
  const { available, track, results, hasPlan } = await officialTrack();
  const scheduled = track.entries.filter((e) => e.status === "scheduled");
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Official PrepTest track</h1>
        <p className="mt-1 text-ink-2">Official tests are the only true calibration. You take them in LawHub; this page decides which one goes on which practice-test day, oldest first with the newest saved for the final weeks, and keeps the tally. The app never stores LSAC questions — only your answers and times, by reference.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>Tests you can access in LawHub</CardTitle>
          <CardDescription>List the PrepTest numbers your LawHub account includes (free account: the sample tests; LawHub Advantage: the full library). Ranges are fine: <code>150-158, 160</code>.</CardDescription>
          <form action={savePtsAction} className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="pts">PrepTest numbers</Label>
              <input id="pts" name="pts" defaultValue={compress(available)} placeholder="e.g. 150-158" className="focus-ring h-10 w-full rounded-[var(--radius)] border border-line bg-bg-elev px-3 text-sm" />
            </div>
            <Button type="submit">Save</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone="neutral">{track.availableCount} available</Badge>
            <Badge tone="ok">{track.takenCount} taken</Badge>
            <Badge tone="accent">{scheduled.length} scheduled</Badge>
            {track.remaining.length > 0 && <Badge tone="warn">{track.remaining.length} unscheduled ({compress(track.remaining)})</Badge>}
          </div>
        </Card>
        <Card>
          <CardTitle>How a PT day works</CardTitle>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
            <li>
              Open{" "}
              <a href={LAWHUB_URL} target="_blank" rel="noreferrer" className="text-accent underline">
                LawHub
              </a>{" "}
              and take the scheduled PrepTest, timed, with the 10-minute break.
            </li>
            <li>Blind-review your flagged questions in LawHub before looking at the score.</li>
            <li>
              <Link href="/test/import" className="text-accent underline">
                Import the results
              </Link>{" "}
              here (answers, keys, times). It joins your score range and the misses land in the Review Inbox.
            </li>
            <li>For each official miss, write a one-line gist on its review page so the tutor and spaced re-drill can work with it.</li>
          </ol>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm" data-testid="official-track">
          <thead className="text-left text-xs text-ink-3">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">PT day</th>
              <th className="px-4 py-2 font-medium">Test</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Score</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {!hasPlan && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-3">
                  No plan yet — finish onboarding and the PT days appear here.
                </td>
              </tr>
            )}
            {track.entries.map((e) => (
              <tr key={e.day} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 text-ink-2">{format(parseISO(e.day), "EEE, MMM d")}</td>
                <td className="px-4 py-2 font-medium">{e.pt != null ? `PrepTest ${e.pt}` : "Simulated test (app bank)"}</td>
                <td className="px-4 py-2">{e.status === "taken" ? <Badge tone="ok">taken</Badge> : e.status === "scheduled" ? <Badge tone="accent">scheduled</Badge> : <Badge tone="neutral">simulated</Badge>}</td>
                <td className="px-4 py-2 text-right tabular-nums">{e.scaled ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  {e.status === "scheduled" && (
                    <Link href={`/test/import?pt=${e.pt}`} className="text-xs text-accent hover:underline">
                      import results
                    </Link>
                  )}
                  {e.status === "simulated" && e.day >= format(new Date(), "yyyy-MM-dd") && (
                    <Link href="/test/pt" className="text-xs text-accent hover:underline">
                      take in app
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {track.extra.map((r) => (
              <tr key={`extra-${r.pt}`} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 text-ink-2">{format(new Date(r.takenAt), "EEE, MMM d")}</td>
                <td className="px-4 py-2 font-medium">PrepTest {r.pt}</td>
                <td className="px-4 py-2">
                  <Badge tone="ok">taken · off-plan</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.scaled ?? "—"}</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-3">
        {results.length} official test{results.length === 1 ? "" : "s"} imported so far. Official scores carry the most weight in the registration advice on <Link href="/plan" className="underline">Plan</Link>.
      </p>
    </div>
  );
}
