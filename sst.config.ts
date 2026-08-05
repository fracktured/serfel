/// <reference path=".sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "serfel",
      removal: input?.stage === "prod" ? "retain" : "remove",
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
    await import("./infra/oidc");
    await import("./infra/vpc");
    await import("./infra/database");
    await import("./infra/bastion");
    await import("./infra/migrate");
    await import("./infra/db-guard");
    await import("./infra/auth");
    await import("./infra/waf");
    await import("./infra/api");
    await import("./infra/frontend");
    await import("./infra/rehost/network");
    await import("./infra/rehost/vpc-endpoints");
    await import("./infra/rehost/ecr");
    await import("./infra/rehost/alb");
    await import("./infra/rehost/fargate");
    await import("./infra/rehost/basic-auth");
    await import("./infra/rehost/node-api");
    await import("./infra/rehost/legacy-frontend");
    await import("./infra/rehost/cdn");
  },
});
