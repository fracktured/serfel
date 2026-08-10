/// <reference path=".sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "serfel",
      // `dev` is temporarily acting as production (while the real prod account
      // waits for CloudFront verification), so it gets the same delete
      // protection as prod. Teardown of a retained stage needs SST_FORCE_REMOVE.
      removal: input?.stage === "prod" || input?.stage === "dev" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          defaultTags: {
            tags: {
              Project: "serfel-ventas",
              Owner: "christian",
              Environment: input?.stage ?? "dev",
            },
          },
        },
      },
    };
  },
  async run() {
    // CloudFront gate: a brand-new AWS account can't create CloudFront
    // distributions until AWS verifies it (support case). Set
    // SST_SKIP_CLOUDFRONT=1 to deploy everything EXCEPT the 3 CloudFront
    // producers (Frontend SPA, legacy Angular 14 site, rehost Router) — used
    // for the unverified prod account. Leave it unset (dev, or prod once
    // verified) to deploy the full stack. See §Fase 6.
    const skipCloudFront = !!process.env.SST_SKIP_CLOUDFRONT;

    await import("./infra/oidc");
    await import("./infra/vpc");
    await import("./infra/database");
    await import("./infra/bastion");
    await import("./infra/migrate");
    await import("./infra/db-guard");
    await import("./infra/auth");
    await import("./infra/waf");
    await import("./infra/api");
    if (!skipCloudFront) await import("./infra/frontend");
    await import("./infra/rehost/network");
    await import("./infra/rehost/vpc-endpoints");
    await import("./infra/rehost/ecr");
    await import("./infra/rehost/alb");
    await import("./infra/rehost/fargate");
    await import("./infra/rehost/basic-auth");
    await import("./infra/rehost/node-api");
    if (!skipCloudFront) {
      await import("./infra/rehost/legacy-frontend");
      await import("./infra/rehost/cdn");
    }
  },
});
