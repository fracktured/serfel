import { apiUrl } from "./api";
import { userPoolClientId, userPoolId } from "./auth";
import { stackTags } from "./tags";

new sst.aws.StaticSite("Frontend", {
  path: "apps/frontend",
  build: {
    command: "pnpm run build",
    output: "dist/frontend/browser",
  },
  environment: {
    APP_API_URL: apiUrl,
    APP_USER_POOL_ID: userPoolId,
    APP_USER_POOL_CLIENT_ID: userPoolClientId,
  },
  // SPA: serve index.html for unknown paths (Angular router handles the rest)
  errorPage: "index.html",
  transform: {
    // `assets` transforms SST's Bucket *component*; the raw S3 bucket that
    // resourcegroupstaggingapi sees is reached one level down via its own
    // `transform.bucket`. Tagging the component args alone is a no-op.
    assets: {
      transform: {
        bucket: (bArgs) => {
          bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("serfel-aws") };
        },
      },
    },
  },
});
