import { build } from 'esbuild';
import { splunkOtelEsbuild } from '@splunk/otel';

build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: 'dist_bundle/bundle.mjs',
  plugins: [splunkOtelEsbuild()],
})
