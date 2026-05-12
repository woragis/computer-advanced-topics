import amqp from "amqplib";
import fs from "node:fs";
import path from "node:path";

const url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
const queue = process.env.LOG_QUEUE ?? "app_logs";
const logDir = process.env.LOG_DIR ?? "/logs";

await fs.promises.mkdir(logDir, { recursive: true });

const conn = await amqp.connect(url);
const ch = await conn.createChannel();
await ch.assertQueue(queue, { durable: true });

console.log(`Logging worker listening on queue "${queue}", writing under ${logDir}`);

ch.consume(
  queue,
  (msg) => {
    if (!msg) return;
    const body = msg.content.toString();
    const line =
      JSON.stringify({
        receivedAt: new Date().toISOString(),
        body,
      }) + "\n";
    const file = path.join(logDir, `events-${new Date().toISOString().slice(0, 10)}.log`);
    try {
      fs.appendFileSync(file, line, "utf8");
      ch.ack(msg);
    } catch (e) {
      console.error("Write failed:", e);
      ch.nack(msg, false, true);
    }
  },
  { noAck: false }
);
