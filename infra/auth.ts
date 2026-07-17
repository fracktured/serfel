import * as aws from "@pulumi/aws";

const userPool = new aws.cognito.UserPool("user-pool", {
  name: "serfel-dev-users",
  usernameAttributes: ["email"],
  autoVerifiedAttributes: ["email"],
  adminCreateUserConfig: { allowAdminCreateUserOnly: true }, // no self-registration
  passwordPolicy: {
    minimumLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  schemas: [
    {
      // maps the Cognito user to legacy 10_m_usuario.id_usuario;
      // surfaces in ID tokens as the "custom:id_usuario" claim
      name: "id_usuario",
      attributeDataType: "Number",
      mutable: true,
      numberAttributeConstraints: { minValue: "1", maxValue: "100000000" },
    },
  ],
  tags: { Name: "serfel-dev-users" },
});

const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
  name: "serfel-dev-web",
  userPoolId: userPool.id,
  explicitAuthFlows: [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH", // used by scripts/api-smoke.sh only
  ],
  preventUserExistenceErrors: "ENABLED",
  accessTokenValidity: 1,
  idTokenValidity: 1,
  refreshTokenValidity: 30,
  tokenValidityUnits: {
    accessToken: "hours",
    idToken: "hours",
    refreshToken: "days",
  },
  readAttributes: ["email", "email_verified", "custom:id_usuario"],
  writeAttributes: ["email"],
});

export const userPoolId = userPool.id;
export const userPoolClientId = userPoolClient.id;
/** e.g. cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXX */
export const userPoolEndpoint = userPool.endpoint;
