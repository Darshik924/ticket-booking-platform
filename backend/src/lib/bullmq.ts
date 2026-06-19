import { Queue } from "bullmq";
import { bullMQConnection } from "./redis";

// Define the payment queue to buffer and process seat payment requests asynchronously
export const paymentQueue = new Queue("paymentQueue", {
  connection: bullMQConnection as any,
});
