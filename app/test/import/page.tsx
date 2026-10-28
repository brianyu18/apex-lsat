import { ImportForm } from "@/components/test/import-form";

export const metadata = { title: "Import a LawHub test" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Import</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Official PrepTest results</h1>
        <p className="mt-1 text-ink-2">
          Take official tests in LawHub, then bring the results here so they count toward your score range, analytics and review inbox. Only your answers and the keys are stored — never the questions.
        </p>
      </header>
      <ImportForm />
    </div>
  );
}
