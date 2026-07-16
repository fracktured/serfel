import {
  DescribeDBInstancesCommand,
  RDSClient,
  StopDBInstanceCommand,
} from "@aws-sdk/client-rds";

const rds = new RDSClient({});
const POLL_MS = 30_000;

// Fired only for RDS-EVENT-0154 ("started because it exceeded the maximum
// allowed time being stopped"). The event arrives while the instance is
// still 'starting', so wait for 'available' before stopping.
export const handler = async (): Promise<void> => {
  const id = process.env.DB_INSTANCE_ID;
  if (!id) throw new Error("DB_INSTANCE_ID not set");

  for (;;) {
    const out = await rds.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: id })
    );
    const status = out.DBInstances?.[0]?.DBInstanceStatus;
    if (status === "available") break;
    if (status === "stopped" || status === "stopping") {
      console.log(`${id} already ${status}; nothing to do`);
      return;
    }
    console.log(`${id} is ${status}; waiting to become stoppable`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  await rds.send(new StopDBInstanceCommand({ DBInstanceIdentifier: id }));
  console.log(`Re-stopped ${id} after forced auto-restart`);
};
