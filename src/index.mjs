import '@splunk/otel/instrument';
import express from 'express';
import axios from 'axios';
import { trace } from '@opentelemetry/api';

const PORT = Number(process.env.PORT) || 8080;
const app = express();
const tracer = trace.getTracer('splunk-otel-example-basic');

app.get('/hello', (_req, res) => {
  const span = tracer.startSpan('hello');
  console.log(201, '/hello');
  res.status(201).send('Hello from node\n');
  span.end();
});

app.get('/', async (_req, res) => {
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
