import { EnQueuedMessage } from "../interfaces";
import { getSensorDB } from "./db";
import { bulkInsertSensorData } from "./handler";

export default {
  async queue(batch, e) {
    const db = getSensorDB(e);
    const messages = batch.messages.map((msg) => msg.body);
    await bulkInsertSensorData(db, messages);
    batch.ackAll();
    console.log(`Processed ${messages.length} sensor data messages`);
  },
} satisfies ExportedHandler<Env, EnQueuedMessage>;
