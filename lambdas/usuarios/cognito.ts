import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { AppError } from "./errors";

const cip = new CognitoIdentityProviderClient({});

export interface CognitoOps {
  listEnrolledIds: () => Promise<Set<number>>;
  enrollCognito: (email: string, idUsuario: number) => Promise<void>;
}

/**
 * Cognito helpers bound to a user pool. `custom:id_usuario` is not a
 * server-side ListUsers filter attribute, so presence is computed by listing
 * users (paginated) and reading the attribute in code — cheap at ~30 users.
 */
export function makeCognito(userPoolId: string): CognitoOps {
  return {
    async listEnrolledIds() {
      const ids = new Set<number>();
      let token: string | undefined;
      do {
        const res = await cip.send(
          new ListUsersCommand({ UserPoolId: userPoolId, Limit: 60, PaginationToken: token })
        );
        for (const u of res.Users ?? []) {
          const attr = u.Attributes?.find((a) => a.Name === "custom:id_usuario");
          const n = attr?.Value ? Number(attr.Value) : NaN;
          if (Number.isInteger(n)) ids.add(n);
        }
        token = res.PaginationToken;
      } while (token);
      return ids;
    },

    async enrollCognito(email: string, idUsuario: number) {
      try {
        await cip.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
              { Name: "custom:id_usuario", Value: String(idUsuario) },
            ],
            DesiredDeliveryMediums: ["EMAIL"],
          })
        );
      } catch (err) {
        if (err instanceof UsernameExistsException) {
          throw new AppError("COGNITO_YA_EXISTE", 409, "Ya existe un usuario de Cognito con ese email");
        }
        throw new AppError("COGNITO_ERROR", 502, "No se pudo crear el usuario en Cognito");
      }
    },
  };
}
