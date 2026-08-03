import * as aws from "@pulumi/aws";
import { stackTags } from "../tags";

function repo(name: string) {
  return new aws.ecr.Repository(`rehost-${name}`, {
    name: `serfel-dev-rehost-${name}`,
    imageTagMutability: "MUTABLE",
    forceDelete: true, // dev only
    imageScanningConfiguration: { scanOnPush: true },
    tags: { Name: `serfel-dev-rehost-${name}`, ...stackTags("serfel-rehost") },
  });
}

const phpApp1 = repo("php-app-1");
const phpApp2 = repo("php-app-2");

export const phpApp1RepoUrl = phpApp1.repositoryUrl;
export const phpApp2RepoUrl = phpApp2.repositoryUrl;
