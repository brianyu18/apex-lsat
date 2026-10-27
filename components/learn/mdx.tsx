import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "./mdx-components";

/** Server-side MDX render: compiles the lesson body and renders it with our component map. */
export async function Mdx({ source }: { source: string }) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    development: false,
    remarkPlugins: [remarkGfm],
    useMDXComponents: () => mdxComponents,
  });
  return <Content components={mdxComponents} />;
}
