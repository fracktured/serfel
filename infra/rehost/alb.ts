import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";
import { publicSubnetIds, vpcId } from "../vpc";
import { sgAlbId } from "./network";
import { stackTags } from "../tags";

// Internet-facing ALB, locked to CloudFront (Branch B): the SG allows HTTP only
// from CloudFront's origin-facing prefix list (network.ts), and the forward
// rule additionally requires a secret X-Origin-Verify header that only the
// rehost CloudFront adds. (Branch A — internal ALB + CloudFront VPC origin — was
// abandoned: it 504'd for 24+ min.) Internet-facing requires public subnets.
const alb = new aws.lb.LoadBalancer("rehost-alb", {
  name: "serfel-dev-rehost-alb",
  internal: false,
  loadBalancerType: "application",
  securityGroups: [sgAlbId],
  subnets: publicSubnetIds,
  tags: { Name: "serfel-dev-rehost-alb", ...stackTags("serfel-rehost") },
});

// Default listener returns 404 for unrouted paths; per-app rules added below.
const listener = new aws.lb.Listener("rehost-alb-listener", {
  loadBalancerArn: alb.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [{
    type: "fixed-response",
    fixedResponse: { contentType: "text/plain", messageBody: "no route", statusCode: "404" },
  }],
  tags: stackTags("serfel-rehost"),
});

// Target group for php-app-1 (ip target type = Fargate).
const phpApp1Tg = new aws.lb.TargetGroup("rehost-php1-tg", {
  name: "serfel-dev-rehost-php1",
  port: 80,
  protocol: "HTTP",
  targetType: "ip",
  vpcId,
  healthCheck: { path: "/health.php", matcher: "200", interval: 30, timeout: 5 },
  tags: { Name: "serfel-dev-rehost-php1", ...stackTags("serfel-rehost") },
});

// Secret header shared with CloudFront: CloudFront adds it on the ALB origin
// (cdn.ts), the ALB forward rule requires it. Requests to the public ALB that
// don't carry it fall through to the default 404 — so only CloudFront is served.
const originVerify = new random.RandomPassword("rehost-origin-verify", {
  length: 32,
  special: false,
});

// One container serves BOTH legacy apps (design §4). `/Distribuidor*` and
// `/SerfelWeb*` (no slash before *, so the bare prefixes match too) forward to
// the same target group — but only when the CloudFront secret header is present.
new aws.lb.ListenerRule("rehost-php-rule", {
  listenerArn: listener.arn,
  priority: 10,
  conditions: [
    { pathPattern: { values: ["/Distribuidor*", "/SerfelWeb*"] } },
    { httpHeader: { httpHeaderName: "X-Origin-Verify", values: [originVerify.result] } },
  ],
  actions: [{ type: "forward", targetGroupArn: phpApp1Tg.arn }],
  tags: stackTags("serfel-rehost"),
});

export const albArn = alb.arn;
export const albDnsName = alb.dnsName;
export const albZoneId = alb.zoneId;
export const albListenerArn = listener.arn;
export const phpApp1TargetGroupArn = phpApp1Tg.arn;
export const originVerifySecret = originVerify.result;
