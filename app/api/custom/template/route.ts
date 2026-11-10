import { TEMPLATE } from "@/lib/custom/schema";

export async function GET() {
  return new Response(JSON.stringify(TEMPLATE, null, 2), { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="apex-test-template.json"' } });
}
