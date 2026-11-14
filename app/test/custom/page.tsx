import Link from "next/link";
import { format } from "date-fns";
import { CustomUpload } from "@/components/test/custom-upload";
import { listCustomTests } from "@/lib/data/custom";
import { Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { deleteCustomTestAction } from "./actions";

export const metadata = { title: "Your own tests" };
export const dynamic = "force-dynamic";

export default async function CustomTestsPage() {
  const tests = await listCustomTests();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your own tests</h1>
        <p className="mt-1 text-ink-2">Upload a test file in the <code>apex-test/1</code> format and take it here: timed, in the LawHub-style interface, with blind review, scoring, analytics and the tutor.</p>
      </header>
      <Card>
        <CardTitle>Add a test</CardTitle>
        <CardDescription>
          One JSON file per test, 1–4 sections. Per question only <code>stem</code>, <code>choices</code> (A–E) and <code>answer</code> are required (LR also needs <code>stimulus</code>); everything else is optional, including the indexing fields (test <code>id</code>, <code>number</code>, <code>year</code>; question <code>number</code>, <code>id</code>, <code>category</code>, <code>skill</code>) and <code>totals</code>, which is checked against the file. The full format is in <code>docs/custom-test-format.md</code>; the template is a working example.
        </CardDescription>
        <div className="mt-4">
          <CustomUpload />
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm" data-testid="custom-tests">
          <thead className="text-left text-xs text-ink-3">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">Test</th>
              <th className="px-4 py-2 font-medium">Sections</th>
              <th className="px-4 py-2 font-medium">Added</th>
              <th className="px-4 py-2 font-medium">Taken</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-3">
                  No tests uploaded yet.
                </td>
              </tr>
            )}
            {tests.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 font-medium">
                  {t.title}
                  {(t.meta?.number != null || t.meta?.year != null || t.meta?.sourceId) && <span className="block text-xs font-normal text-ink-3">{[t.meta.number != null ? `#${t.meta.number}` : null, t.meta.year ?? null, t.meta.sourceId ?? null].filter((x) => x != null).join(" · ")}</span>}
                </td>
                <td className="px-4 py-2 text-ink-2">
                  {t.sections.map((s) => s.kind).join(" · ")} · {t.nQuestions} scored Q
                </td>
                <td className="px-4 py-2 text-ink-2">{format(t.createdAt, "MMM d")}</td>
                <td className="px-4 py-2 tabular-nums">{t.attempts ? `${t.attempts}× · last ${t.lastScaled ?? "—"}` : "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm">
                      <Link href={`/test/custom/${t.id}`}>Take</Link>
                    </Button>
                    <form action={deleteCustomTestAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="text-xs text-ink-3 hover:text-bad">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
