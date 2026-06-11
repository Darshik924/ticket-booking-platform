// import { Queue, Worker, QueueEvents } from 'bullmq';
// import { bullMQConnection } from './redis';

// // Queue — your Express routes add jobs here
// export const bookingQueue = new Queue('bookings', {
//   connection: bullMQConnection,
//   defaultJobOptions: {
//     attempts: 3,                        // retry failed jobs 3 times
//     backoff: { type: 'exponential', delay: 1000 },
//     removeOnComplete: { count: 100 },   // keep last 100 completed jobs
//     removeOnFail: { count: 50 },
//   },
// });

// // QueueEvents — lets you listen for job completion from outside the worker
// export const bookingQueueEvents = new QueueEvents('bookings', {
//   connection: bullMQConnection,
// });

// console.log('BullMQ booking queue initialized');