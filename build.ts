import { build } from 'esbuild';
import { otelEsbuildPlugin } from './otel-esbuild-plugin';

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist_bundle/bundle.js',
  plugins: [
    otelEsbuildPlugin({
      modules: ['express', 'kafkajs'],
      sdkModule: '@splunk/otel',   // lub 'splunk-otel-js' w starszych projektach
      startFnName: 'start',        // plugin sam spadnie do startTracing, jeśli trzeba
    })
  ]
});
