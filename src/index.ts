import '@splunk/otel/instrument';
import express from 'express';
import axios from 'axios';
import { trace, Span } from '@opentelemetry/api';


const PORT: number = Number(process.env.PORT) || 8079;
const app = express();
const tracer = trace.getTracer('splunk-otel-example-basic');

app.get('/hello', (_req, res): void => {
  const span: Span = tracer.startSpan('hello');
  console.log(201, '/hello');
  res.status(201).send('Hello from node\n');
  span.end();
});

app.get('/', async (_req, res): Promise<void> => {
  try {
    const response = await axios.get(`http://localhost:${PORT}/hello`);
    console.log(200, '/');
    res.status(200).send(`Hello from node: ${response.status}\n`);
  } catch (err) {
    console.log(500, '/', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).send(`Error from node: ${message}\n`);
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


// const Kafka = require('kafkajs'); // Import kafkajs to trigger instrumentation
// import { Kafka } from 'kafkajs'; // Import kafkajs to trigger instrumentation
// const kafka = new Kafka({
//   clientId: 'my-producer',
//   brokers: ['localhost:9092'],
// });

// const producer = kafka.producer();

// async function produceMessage() {
//   await producer.connect();
//   await producer.send({
//     topic: 'test-topic',
//     messages: [
//       { key: 'key1', value: 'Hello Kafka from TypeScript' },
//     ],
//   });
//   console.log('Message sent');
//   await producer.disconnect();
//   setTimeout(() => {

//   }, 10000);
// }

// produceMessage().catch(console.error);

