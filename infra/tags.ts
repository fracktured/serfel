/** Application group a resource belongs to, surfaced as the `serfel:stack` tag. */
export type StackTag = "serfel-aws" | "serfel-rehost" | "serfel-shared";

/**
 * Per-module tag identifying the app group. Merge into a resource's `tags`
 * (raw Pulumi resources) or inject via a component's `transform` (SST
 * components). The global Project/Owner/Environment tags come from
 * `defaultTags` in sst.config.ts and are NOT repeated here.
 */
export function stackTags(stack: StackTag): { "serfel:stack": StackTag } {
  return { "serfel:stack": stack };
}
