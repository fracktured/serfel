import * as aws from "@pulumi/aws";
import { privateSubnetIds, vpcId } from "../vpc";
import { sgAlbId } from "./network";

// Internal ALB — not internet-facing. CloudFront reaches it via the origin
// wiring chosen in Task 8.
const alb = new aws.lb.LoadBalancer("rehost-alb", {
  name: "serfel-dev-rehost-alb",
  internal: true,
  loadBalancerType: "application",
  securityGroups: [sgAlbId],
  subnets: privateSubnetIds,
  tags: { Name: "serfel-dev-rehost-alb" },
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
});

// Target group for php-app-1 (ip target type = Fargate).
const phpApp1Tg = new aws.lb.TargetGroup("rehost-php1-tg", {
  name: "serfel-dev-rehost-php1",
  port: 80,
  protocol: "HTTP",
  targetType: "ip",
  vpcId,
  healthCheck: { path: "/health.php", matcher: "200", interval: 30, timeout: 5 },
  tags: { Name: "serfel-dev-rehost-php1" },
});

// One container serves BOTH legacy apps (design §4), so both real path
// prefixes forward to the same target group.
new aws.lb.ListenerRule("rehost-php-rule", {
  listenerArn: listener.arn,
  priority: 10,
  conditions: [{ pathPattern: { values: ["/Distribuidor/*", "/SerfelWeb/*"] } }],
  actions: [{ type: "forward", targetGroupArn: phpApp1Tg.arn }],
});

export const albArn = alb.arn;
export const albDnsName = alb.dnsName;
export const albZoneId = alb.zoneId;
export const albListenerArn = listener.arn;
export const phpApp1TargetGroupArn = phpApp1Tg.arn;
