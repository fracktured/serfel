import { stackTags } from "../tags";
import { webAclArn } from "../waf";

// Coproad legacy Angular build, served under /coproad/* by the RehostRouter.
// Built with --base-href=/coproad/ and nested under a coproad/ dir so bucket
// paths (/coproad/index.html, /coproad/main.js) match the routed prefix.
export const coproadSite = new sst.aws.StaticSite("RehostCoproadFrontend", {
  path: "apps/legacy-frontend/dist/coproad-ang",
  // Deep-link/refresh under /coproad/* falls back to the nested index.
  errorPage: "coproad/index.html",
  transform: {
    assets: {
      transform: {
        bucket: (bArgs) => {
          bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
        },
      },
    },
    cdn: (cdnArgs) => {
      cdnArgs.webAclArn = webAclArn;
    },
  },
});

export const coproadFrontendUrl = coproadSite.url;

// Manual-deploy migration (Deploy 1): empty bucket for the coproad variant.
// Built with base-href /coproad/ and nested under a coproad/ dir, so synced
// objects live at coproad/index.html, coproad/main.js, ... matching the routed
// /coproad/* prefix. The Router flips to this bucket in Deploy 2.
export const coproadBucket = new sst.aws.Bucket("RehostCoproadFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
    },
  },
});
