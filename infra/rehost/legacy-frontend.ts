import { stackTags } from "../tags";

// SST owns this empty bucket; the legacy Angular 14 serfel app (dist/serfel-ang)
// is pushed manually — see apps/legacy-frontend/README.md. The rehost Router
// (infra/rehost/cdn.ts) serves it at `/*` with a per-route SPA fallback.
export const legacyBucket = new sst.aws.Bucket("RehostLegacyFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
    },
  },
});
