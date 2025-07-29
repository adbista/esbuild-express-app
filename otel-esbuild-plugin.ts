import type { Plugin } from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function otelEsbuildPlugin(): Plugin {

  const sdkModule = '@splunk/otel';
  const startFnName = 'start';
  const onceGlobal = '__splunkOtelStarted';
  return {
    name: 'otel-esbuild-plugin',
    setup(build) {

      build.onResolve({ filter: /^express$/ }, (args) => {
        console.log(`[otel-esbuild-plugin] Resolving: ${args.path} in ${args.resolveDir}`);
        const resolved = require.resolve(args.path, { paths: [args.resolveDir] });
        console.log(`[otel-esbuild-plugin] Resolved to: ${resolved}`);
        return {
          path: resolved,
          namespace: 'splunk-otel'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'splunk-otel' }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');

        const header = `
              (function () {
        const g = globalThis;
        if (!g['${onceGlobal}']) {
          const _start = __splunkOtel['${startFnName}'] 
          if (typeof _start === 'function') {
            _start();
          } else {
            console.warn('[otel-esbuild-plugin] Cannot find start function on ${sdkModule}.');
          }
          g['${onceGlobal}'] = true;
        }
      })();
      // /**
      //  * Auto-injected by otel-esbuild-plugin.
      //  * Manually patching Express
      //  */
      // import * as __splunkOtel from '${sdkModule}';
      // import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

      // // After execution, __expMod will hold the final exports of the original Express module.
      // let __expMod = {};
      // (function (module) {
      // ${source}
      // __expMod = module.exports;
      // })({ exports: {} });
      // console.log('[otel-esbuild-plugin] Express module:', __expMod);

      // // Express instrumentation
      // const __inst = new ExpressInstrumentation();

      // // patch private instrumentation module definitions manually
      // const __defs = __inst._modules;
      // console.log('[otel-esbuild-plugin] Instrumentation modules:', __defs);
      // const def = __defs.find((d) => d.name === 'express');
      // try {
      //   def.patch(__expMod, 'express');
      // } catch (e) {
      //   console.warn('[otel-esbuild-plugin] def.patch threw:', e);
      // }

      // // export the patched module
      // export default __expMod;
      `;

        return {
          contents: header,
          loader: inferLoader(args.path),
          resolveDir: path.dirname(args.path)
        };
      });

    },
  };
}


function inferLoader(file: string): 'js' | 'ts' {
  const ext = path.extname(file);
  if (ext === '.ts') return 'ts';
  return 'js';
}

