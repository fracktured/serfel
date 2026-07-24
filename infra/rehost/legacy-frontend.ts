export const legacySite = new sst.aws.StaticSite("RehostLegacyFrontend", {
  // Pre-built Angular 14 output (built with Node 16 — SST runs on Node 22, so
  // no SST-run build command here; CI must build with Node 16 for prod, Fase 6).
  path: "apps/legacy-frontend/dist/serfel-ang",
  // SPA fallback for the Angular router (matches infra/frontend.ts).
  errorPage: "index.html",
});

export const legacyFrontendUrl = legacySite.url;
