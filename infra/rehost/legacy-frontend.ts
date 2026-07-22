export const legacySite = new sst.aws.StaticSite("RehostLegacyFrontend", {
  path: "legacy-frontend-skeleton",
  // SPA fallback for the Angular router (matches infra/frontend.ts).
  errorPage: "index.html",
});

export const legacyFrontendUrl = legacySite.url;
