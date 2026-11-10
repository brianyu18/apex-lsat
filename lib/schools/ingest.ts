/**
 * Parses an ABA Standard 509 compilation (CSV rows already read into objects)
 * into the School shape. Header names vary a little year to year, so columns
 * are found by fuzzy match. Rows without the six percentile figures are
 * skipped and reported.
 */
import type { School } from "./odds";

export type RawRow = Record<string, string | number | null | undefined>;

// Exact 509 names (the compilation lists "State, University of"); substring matching mis-tags e.g. Chicago-Kent.
const T14 = new Set(["Yale University", "Stanford University", "Harvard University", "Chicago, The University of", "Columbia University", "Pennsylvania, University of", "New York University", "Virginia, University of", "Michigan, University of", "Duke University", "Northwestern University", "California-Berkeley, University of", "Cornell University", "Georgetown University"]);
// The compilation has no state column; California schools are identified by name.
const CA = /^California-|^California Western|^Southern California, University of|^Stanford University|^Santa Clara University|^San Francisco, University of|^San Diego, University of|^Pepperdine|^Loyola Marymount|^Southwestern Law School|^Chapman University|^Pacific, University of the|^Western State|^La Verne, University of|^Golden Gate/;

function findKey(keys: string[], ...needles: RegExp[]): string | null {
  for (const n of needles) {
    const k = keys.find((k) => n.test(k.toLowerCase().replace(/\s+/g, " ")));
    if (k) return k;
  }
  return null;
}
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[,%$]/g, ""));
  return Number.isFinite(n) ? n : null;
};
export function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parse509(rows: RawRow[], year: number): { schools: School[]; skipped: { name: string; reason: string }[] } {
  if (!rows.length) return { schools: [], skipped: [] };
  const keys = Object.keys(rows[0]);
  const kName = findKey(keys, /^school ?name$/, /school/, /institution/);
  const kState = findKey(keys, /^state$/);
  const kL25 = findKey(keys, /lsat.*25/, /25.*lsat/);
  const kL50 = findKey(keys, /lsat.*(50|median)/, /(50|median).*lsat/);
  const kL75 = findKey(keys, /lsat.*75/, /75.*lsat/);
  const kG25 = findKey(keys, /gpa.*25/, /25.*gpa/);
  const kG50 = findKey(keys, /gpa.*(50|median)/, /(50|median).*gpa/);
  const kG75 = findKey(keys, /gpa.*75/, /75.*gpa/);
  const kApps = findKey(keys, /^(total )?applications?$/, /applicants|applications/);
  const kOffers = findKey(keys, /offers?/, /admitted|acceptances/);
  const kMatric = findKey(keys, /matriculants?/, /enroll/);
  if (!kName || !kL25 || !kL50 || !kL75 || !kG25 || !kG50 || !kG75) throw new Error(`Could not find the required columns. Found: ${keys.join(" | ")}`);
  const schools: School[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const r of rows) {
    const name = String(r[kName] ?? "").trim();
    if (!name) continue;
    const vals = [kL25, kL50, kL75, kG25, kG50, kG75].map((k) => num(r[k]));
    if (vals.some((v) => v == null)) {
      skipped.push({ name, reason: "missing percentile data" });
      continue;
    }
    const [lsat25, lsat50, lsat75, gpa25, gpa50, gpa75] = vals as number[];
    const state = String((kState && r[kState]) ?? "").trim().toUpperCase().slice(0, 2) || (CA.test(name) ? "CA" : "");
    const tags: string[] = [];
    if (T14.has(name)) tags.push("t14");
    if (state === "CA") tags.push("ca");
    schools.push({ id: slug(name), name, state, year, lsat25, lsat50, lsat75, gpa25, gpa50, gpa75, applicants: kApps ? num(r[kApps]) : null, offers: kOffers ? num(r[kOffers]) : null, matriculants: kMatric ? num(r[kMatric]) : null, tags });
  }
  return { schools: schools.sort((a, b) => b.lsat50 - a.lsat50 || a.name.localeCompare(b.name)), skipped };
}
