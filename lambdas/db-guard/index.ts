import { RDSClient, StopDBInstanceCommand } from "@aws-sdk/client-rds";

const rds = new RDSClient({});

// Fired only for RDS-EVENT-0154: "DB instance is being started due to it
// exceeding the maximum allowed time being stopped." We stop it right back.
export const handler = async (): Promise<void> => {
  const id = process.env.DB_INSTANCE_ID!;
  try {
    await rds.send(new StopDBInstanceCommand({ DBInstanceIdentifier: id }));
    console.log(`Re-stopped ${id} after forced auto-restart`);
  } catch (err) {
    // Instance may still be 'starting'; EventBridge retries the invocation.
    console.error(`Failed to stop ${id}, will retry`, err);
    throw err;
  }
};
