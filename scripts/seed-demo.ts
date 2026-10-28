import { seedDemo } from "@/lib/dev/seed";
/** pnpm tsx scripts/seed-demo.ts [--weeks=6] — fills the local DB with demo history (never touches settings/plan). */
const weeks = Number((process.argv.find((a) => a.startsWith("--weeks=")) ?? "--weeks=6").split("=")[1]);
console.log(await seedDemo({ weeks }));
process.exit(0);
