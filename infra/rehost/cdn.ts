import type { input as awsInputs } from "@pulumi/aws/types";
import { nodeApiUrl } from "./node-api";
import { legacySite } from "./legacy-frontend";
import { albDnsName, originVerifySecret } from "./alb";

// --- Task 8, Branch B -------------------------------------------------------
// CloudFront reaches the (now internet-facing, CloudFront-locked) ALB via a
// plain HTTP custom origin. Branch A (CloudFront VPC origin → internal ALB) was
// abandoned after it returned 504 for 24+ min despite provably-correct wiring.
//
// The `sst.aws.Router` handles the S3 legacy site (`/*`) and the node API
// (`/api/node/*`) as native routes. The Router's `{ url }` route type can't
// express a custom origin with custom headers, so the ALB is spliced onto the
// same distribution via `transform.cdn`: one extra origin (with the secret
// X-Origin-Verify header CloudFront sends to the ALB) plus two ordered cache
// behaviors. Path patterns use no slash before `*` so the bare `/Distribuidor`
// and `/SerfelWeb` match too (the `/X/*` form missed them → S3 default).
const albOriginId = "rehost-alb-origin";

// CloudFront managed policy IDs (stable across accounts/regions).
const CACHING_DISABLED_POLICY_ID = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad";
const ALL_VIEWER_EXCEPT_HOST_HEADER_POLICY_ID =
  "b689b0a8-53d0-40ab-baf2-68738e2966ac";

function albBehavior(
  pathPattern: string,
): awsInputs.cloudfront.DistributionOrderedCacheBehavior {
  return {
    pathPattern,
    targetOriginId: albOriginId,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
    cachedMethods: ["GET", "HEAD"],
    compress: true,
    // Dynamic PHP app: never cache; forward everything (incl. Authorization and
    // cookies) except the Host header. (Custom origin headers like the secret
    // X-Origin-Verify are always sent regardless of this policy.)
    cachePolicyId: CACHING_DISABLED_POLICY_ID,
    originRequestPolicyId: ALL_VIEWER_EXCEPT_HOST_HEADER_POLICY_ID,
  };
}

// Router = CloudFront with path-based routing. Default origin: legacy Angular
// static site. The ALB origin + behaviors are added via `transform.cdn` below.
const router = new sst.aws.Router("RehostRouter", {
  routes: {
    "/api/node/*": nodeApiUrl,
    "/*": legacySite.url,
  },
  transform: {
    cdn: (args) => {
      const origins = args.origins as unknown as awsInputs.cloudfront.DistributionOrigin[];
      const behaviors =
        (args.orderedCacheBehaviors as unknown as
          | awsInputs.cloudfront.DistributionOrderedCacheBehavior[]
          | undefined) ?? [];

      args.origins = [
        ...origins,
        {
          originId: albOriginId,
          domainName: albDnsName,
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: "http-only", // ALB listener is HTTP-only
            originSslProtocols: ["TLSv1.2"],
            originReadTimeout: 30,
            originKeepaliveTimeout: 5,
          },
          customHeaders: [
            { name: "X-Origin-Verify", value: originVerifySecret },
          ],
        },
      ] as unknown as typeof args.origins;

      args.orderedCacheBehaviors = [
        ...behaviors,
        albBehavior("/Distribuidor*"),
        albBehavior("/SerfelWeb*"),
      ] as unknown as typeof args.orderedCacheBehaviors;

      args.comment = "serfel-dev-rehost-router";
    },
  },
});

export const rehostCdnUrl = router.url;
