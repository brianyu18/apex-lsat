/**
 * Official LSAT administrations (U.S./Canada), from LSAC's dates page
 * (https://www.lsac.org/LSATdates, fetched 2026-10-28; LSAC notes dates are
 * subject to change). Each administration spans several days; the plan targets
 * the first day — you can't take it later than your appointment anyway.
 * Add new rows as LSAC publishes them.
 */
export interface Administration {
  id: string; // "2027-01"
  label: string; // "January 2027"
  firstDay: string; // YYYY-MM-DD
  lastDay: string;
  registrationDeadline: string;
  scoreRelease: string;
}

export const ADMINISTRATIONS: Administration[] = [
  { id: "2026-09", label: "September 2026", firstDay: "2026-09-09", lastDay: "2026-09-12", registrationDeadline: "2026-07-28", scoreRelease: "2026-09-30" },
  { id: "2026-10", label: "October 2026", firstDay: "2026-10-07", lastDay: "2026-10-10", registrationDeadline: "2026-08-27", scoreRelease: "2026-10-28" },
  { id: "2026-11", label: "November 2026", firstDay: "2026-11-11", lastDay: "2026-11-14", registrationDeadline: "2026-10-01", scoreRelease: "2026-12-02" },
  { id: "2027-01", label: "January 2027", firstDay: "2027-01-13", lastDay: "2027-01-16", registrationDeadline: "2026-12-01", scoreRelease: "2027-02-03" },
  { id: "2027-02", label: "February 2027", firstDay: "2027-02-12", lastDay: "2027-02-13", registrationDeadline: "2026-12-29", scoreRelease: "2027-03-03" },
  { id: "2027-04", label: "April 2027", firstDay: "2027-04-08", lastDay: "2027-04-10", registrationDeadline: "2027-02-25", scoreRelease: "2027-04-28" },
  { id: "2027-06", label: "June 2027", firstDay: "2027-06-09", lastDay: "2027-06-12", registrationDeadline: "2027-04-29", scoreRelease: "2027-06-30" },
];

/** Administrations whose first day is after `today`; `registrable` = deadline not yet passed. */
export function upcomingAdministrations(today: string) {
  return ADMINISTRATIONS.filter((a) => a.firstDay > today).map((a) => ({ ...a, registrable: a.registrationDeadline >= today }));
}

export function administrationFor(testDate: string | null | undefined) {
  if (!testDate) return null;
  return ADMINISTRATIONS.find((a) => testDate >= a.firstDay && testDate <= a.lastDay) ?? null;
}
