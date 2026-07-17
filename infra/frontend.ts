import { apiUrl } from "./api";
import { userPoolClientId, userPoolId } from "./auth";

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
});
