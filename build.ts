import { build, BuildContext, PluginBuild } from 'esbuild';
//import { openTelemetryPlugin } from "@splunk/otel/lib/esbuild-plugin/opentelemetry-esbuild-plugin-node/src";
import { openTelemetryPlugin } from "opentelemetry-esbuild-plugin-node";
import { getInstrumentations } from '@splunk/otel/lib/instrumentations';
// @ts-ignore
import { nativeNodeModulesPlugin } from 'esbuild-native-node-modules-plugin';
import { copy } from 'esbuild-plugin-copy';
import * as fs from 'node:fs';

const fixDirname = {
  name: 'fix-dirname',
  setup(build: PluginBuild) {
    build.onLoad({ filter: /native_ext[\\/]+index\.js$/ }, async (args) => {
      console.log('Fixing native_ext index.js:', args.path);
      return {
        contents: `
        const path = require('path');
        module.exports = require('node-gyp-build')(path.join(__dirname,"./"));`,
        loader: 'js',
      };
    });
  },
};

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18', 
  outfile: 'dist_bundle/bundle.js',
  // loader: { '.node': 'file' },
  // assetNames: 'prebuilds/[dir]/[name]',
  external: [], 
  plugins: [
    openTelemetryPlugin({
      instrumentations: getInstrumentations(),
    }),
    fixDirname,
    copy({
      assets: [
    //    { from: ['./node_modules/@splunk/otel/lib/native_ext/**/*'], to: ['./native_ext'] },
        { from: ['./node_modules/@splunk/otel/lib/prebuilds/**/*'], to: ['./prebuilds'] },
      ],
    }),    
   ]
});





const ignorePkgJson = {
  name: 'ignore-node-gyp-build-pkgjson',
  setup(build: PluginBuild) {
    build.onResolve({ filter: /^node-gyp-build$/ }, () => ({
      path: 'node-gyp-build', external: true, sideEffects: false,
    }));
  },
};