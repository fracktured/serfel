import { stackTags } from "../tags";

// SST owns this empty bucket; the coproad variant (dist/coproad-ang, nested
// under coproad/) is pushed manually — see apps/legacy-frontend/README.md. The
// rehost Router serves it at `/coproad/*` with a per-route SPA fallback.
export const coproadBucket = new sst.aws.Bucket("RehostCoproadFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
    },
  },
});
