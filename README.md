# Splunk OpenTelemetry Example – Basic Express App with esbuild

## Prerequisites

- Node.js 18+
- Local Splunk OpenTelemetry Collector binary (for example: `otelcol`)

---

## Step 1 – Prepare Local Splunk OpenTelemetry JS Fork

```bash
git clone git@github.com:adbista/splunk-otel-js.git
cd splunk-otel-js
git checkout feat/esbuild-plugin-support
npm ci
npm run compile
npm run test
npm run prebuild:os
````

> `prebuild:os` is necessary to generate the `prebuilds/` directory with native `.node` binaries (e.g. for profiling).

---

## Step 2 – Clone Example Project

```bash
git clone git@github.com:adbista/esbuild-express-app.git
cd esbuild-express-app
npm install
```

In your `package.json`, update the `"@splunk/otel"` dependency to point to the local path of your cloned `splunk-otel-js` repository.

For example:
```json
"@splunk/otel": "file://absolute/path/to/splunk-otel-js"
```

---

##  Step 3 – Start Local Splunk OpenTelemetry Collector

You need a locally available `otelcol` binary and a config file like this:

**collector-config.yml:**

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug/info:
    verbosity: detailed
  zipkin:
    endpoint: "http://zipkin:9411/api/v2/spans"

processors:
  batch:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug/info]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug/info]
    logs/profiling:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug/info]
```

Run the collector:

```bash
./otelcol --config=./collector-config.yml
```

---

## Step 4 – Run CJS Version (Bundled)

```bash
npm run esbuild-cjs
npm run esbuild-cjs-start
```

* Open browser at [http://localhost:8080](http://localhost:8080)
* Observe collector logs
* You should see spans like:

  * `middleware - expressInit`
  * `request handler - /hello`

**Note:** It might take **10–15 seconds** for **metrics** and **profiling** to appear.

### Output Files:

* `dist_bundle/bundle.js` – bundled application
* `dist_bundle/splunk-profiling/` – native profiling files (copied during bundling)

In `index.js`, we have this at the top:

```js
require('@splunk/otel/instrument');
```

This makes Splunk otel library **bundled directly** into the app.

---

## Step 5 – Run ESM Version (Bundled)

First, restart the collector in a **new terminal window**.

Then run:

```bash
npm run clear-bundle
npm run esbuild-esm
npm run esbuild-esm-start
```

* Go to [http://localhost:8080](http://localhost:8080)
* Check collector logs for express spans, metrics, and profiling.

### Note:

Top of `index.mjs` contains:

```ts
import '@splunk/otel/instrument';
```

which makes instrumentation part of the bundle (same as in CJS case).

---

## Step 6 – Try Auto-Instrumentation Instead of Bundling

We now want to **test auto-instrumentation**.

### Step-by-step:

1. Stop the collector and restart it in a new terminal
2. Run:

   ```bash
   npm run clear-bundle
   ```
3. Comment out or remove:

   ```js
   require('@splunk/otel/instrument'); // from index.js
   import '@splunk/otel/instrument';  // from index.mjs
   ```
4. Run:

   ```bash
   npm run esbuild-cjs
   npm run esbuild-cjs-start-otel
   ```

* Visit [http://localhost:8080](http://localhost:8080)
* Observe collector logs again

### You should notice:

* Smaller bundle size (since `@splunk/otel` is no longer inlined)
* No `splunk-profiling` folder in `dist_bundle/`

---

## Step 7 – Same Test for ESM with Auto-Instrumentation

```bash
npm run clear-bundle
npm run esbuild-esm
npm run esbuild-esm-start-otel
```

* Open [http://localhost:8080](http://localhost:8080)
* Check collector logs again (expect same behavior as in CJS case)
