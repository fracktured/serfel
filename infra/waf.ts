import * as aws from "@pulumi/aws";
import { stackTags } from "./tags";

// CLOUDFRONT-scope Web ACL. Must live in us-east-1 (the stack's region).
// Attached to all three public CloudFront distributions via each component's
// `transform.cdn` (webAclArn). HTTP API v2 can't take WAF directly, so the
// new-app Cognito API stays uncovered by design — see the WAF design spec §2.1.
const webAcl = new aws.wafv2.WebAcl("SerfelWaf", {
  name: `serfel-${$app.stage}-waf`,
  scope: "CLOUDFRONT",
  defaultAction: { allow: {} },
  rules: [
    {
      name: "AmazonIpReputationList",
      priority: 0,
      // Managed group: keep the vendor's built-in Block actions.
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: "AWS",
          name: "AWSManagedRulesAmazonIpReputationList",
        },
      },
      visibilityConfig: {
        cloudwatchMetricsEnabled: true,
        metricName: "serfel-ip-reputation",
        sampledRequestsEnabled: true,
      },
    },
    {
      name: "KnownBadInputs",
      priority: 1,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: "AWS",
          name: "AWSManagedRulesKnownBadInputsRuleSet",
        },
      },
      visibilityConfig: {
        cloudwatchMetricsEnabled: true,
        metricName: "serfel-known-bad-inputs",
        sampledRequestsEnabled: true,
      },
    },
    {
      name: "RateLimit",
      priority: 2,
      // Custom rate rule: this one uses `action`, not `overrideAction`.
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit: 1000, // requests per IP per evaluation window
          aggregateKeyType: "IP",
          evaluationWindowSec: 300, // 5-minute sliding window
        },
      },
      visibilityConfig: {
        cloudwatchMetricsEnabled: true,
        metricName: "serfel-rate-limit",
        sampledRequestsEnabled: true,
      },
    },
  ],
  visibilityConfig: {
    cloudwatchMetricsEnabled: true,
    metricName: "serfel-waf",
    sampledRequestsEnabled: true,
  },
  tags: { Name: `serfel-${$app.stage}-waf`, ...stackTags("serfel-shared") },
});

export const webAclArn = webAcl.arn;
