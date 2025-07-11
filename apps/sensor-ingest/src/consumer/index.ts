import { getSensorDB } from "./db";
import { bulkInsertSensorData } from "./handler";

export default {
  async queue(batch, e) {
    const db = getSensorDB(e);
    const messages = batch.messages.map(
      (msg) => JSON.parse(msg.body) as { event: string; data: unknown }
    );
    await bulkInsertSensorData(db, messages);
    batch.ackAll();
    console.log(`Processed ${messages.length} sensor data messages`);
  },
} satisfies ExportedHandler<Env, string>;
