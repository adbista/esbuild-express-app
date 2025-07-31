import { build } from 'esbuild';
import { splunkOtelEsbuild } from '@splunk/otel';

build({
  entryPoints: ['src/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist_bundle/bundle.js',
  plugins: [splunkOtelEsbuild()],
})
