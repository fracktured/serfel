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
  },
});
