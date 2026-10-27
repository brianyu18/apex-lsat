import { LR_TYPE_INFO, RC_QTYPE_INFO } from "./taxonomy";

/** Human label for an LR type or RC question type id. Safe in server and client components. */
export function typeLabel(type: string) {
  return (LR_TYPE_INFO as Record<string, { label: string }>)[type]?.label ?? (RC_QTYPE_INFO as Record<string, { label: string }>)[type]?.label ?? type.replace(/_/g, " ");
}
