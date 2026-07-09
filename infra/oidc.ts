import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const githubOidcProvider = new aws.iam.OpenIdConnectProvider("github-oidc", {
  url: "https://token.actions.githubusercontent.com",
  clientIdLists: ["sts.amazonaws.com"],
  // AWS validates GitHub tokens via public keys since 2023; thumbprint still required by provider
  thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
});

const assumeRolePolicy = pulumi
  .all([githubOidcProvider.arn])
  .apply(([providerArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: providerArn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            },
            StringLike: {
              "token.actions.githubusercontent.com:sub":
                "repo:fracktured/serfel:*",
            },
          },
        },
      ],
    })
  );

const githubActionsRole = new aws.iam.Role("github-actions-role", {
  name: "serfel-github-actions-role",
  assumeRolePolicy,
});

new aws.iam.RolePolicyAttachment("github-actions-admin", {
  role: githubActionsRole.name,
  policyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
});

export const githubActionsRoleArn = githubActionsRole.arn;
