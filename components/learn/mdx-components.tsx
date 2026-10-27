import type { MDXComponents } from "mdx/types";
import { ArgumentMap } from "@/components/diagrams/argument-map";
import { ConditionalChain } from "@/components/diagrams/conditional-chain";
import { SetSandbox } from "@/components/diagrams/set-sandbox";
import { CausalModel } from "@/components/diagrams/causal-model";
import { TrapCatalog } from "@/components/diagrams/trap-catalog";
import { Callout, Example, KeyIdea, Steps } from "./blocks";

export const mdxComponents: MDXComponents = {
  ArgumentMap,
  ConditionalChain,
  SetSandbox,
  CausalModel,
  TrapCatalog,
  Callout,
  Example,
  KeyIdea,
  Steps,
  h2: (p) => <h2 className="mt-8 text-xl font-semibold tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-6 text-base font-semibold" {...p} />,
  p: (p) => <p className="my-3 leading-7 text-ink" {...p} />,
  ul: (p) => <ul className="my-3 list-disc space-y-1 pl-6" {...p} />,
  ol: (p) => <ol className="my-3 list-decimal space-y-1 pl-6" {...p} />,
  li: (p) => <li className="leading-7" {...p} />,
  blockquote: (p) => <blockquote className="lsat-text my-4 border-l-2 border-accent pl-4 text-ink-2" {...p} />,
  code: (p) => <code className="rounded bg-bg-sunken px-1 py-0.5 font-mono text-[0.9em]" {...p} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  table: (p) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-line px-2 py-1.5 text-left font-medium text-ink-2" {...p} />,
  td: (p) => <td className="border-b border-line px-2 py-1.5 align-top" {...p} />,
};
