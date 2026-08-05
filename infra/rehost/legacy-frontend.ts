import { stackTags } from "../tags";
import { webAclArn } from "../waf";

export const legacySite = new sst.aws.StaticSite("RehostLegacyFrontend", {
  // Pre-built Angular 14 output (built with Node 16 — SST runs on Node 22, so
  // no SST-run build command here; CI must build with Node 16 for prod, Fase 6).
  path: "apps/legacy-frontend/dist/serfel-ang",
  // SPA fallback for the Angular router (matches infra/frontend.ts).
  errorPage: "index.html",
  transform: {
    // See infra/frontend.ts: tag the raw S3 bucket via the Bucket component's
    // own `transform.bucket`, not the component args (which is a no-op).
    assets: {
      transform: {
        bucket: (bArgs) => {
          bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
        },
      },
    },
    cdn: (cdnArgs) => {
      cdnArgs.webAclArn = webAclArn;
    },
  },
});

export const legacyFrontendUrl = legacySite.url;
