// otel-esbuild-plugin.ts
import type { Plugin } from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface OtelEsbuildPluginOptions {
  /**
   * Lista modułów, które mają zostać „owinięte” (np. ["express", "kafkajs"]).
   */
  modules: string[];

  /**
   * Pakiet SDK Splunka. W nowych wersjach to '@splunk/otel'.
   * W starszych projektach może to być 'splunk-otel-js'.
   */
  sdkModule?: string;

  /**
   * Nazwa funkcji startującej SDK. W nowszych wersjach to 'start',
   * w starszych 'startTracing'. Plugin i tak spróbuje wykryć obie.
   */
  startFnName?: 'start' | 'startTracing';

  /**
   * Flaga globalna, która zabezpiecza przed wielokrotnym wywołaniem startu.
   */
  onceGlobal?: string;
}

export function otelEsbuildPlugin(opts: OtelEsbuildPluginOptions): Plugin {
  const {
    modules,
    sdkModule = '@splunk/otel',
    startFnName = 'start',
    onceGlobal = '__splunkOtelStarted'
  } = opts;

  if (!Array.isArray(modules) || modules.length === 0) {
    throw new Error('otelEsbuildPlugin: provide at least one module to instrument (e.g. ["express"]).');
  }

  const filter = new RegExp(`^(${modules.map(escapeRegex).join('|')})$`);

  return {
    name: 'otel-esbuild-plugin',
    setup(build) {
      // Działa tylko w Node – w przeglądarce i tak nie ma sensu
      if (build.initialOptions.platform && build.initialOptions.platform !== 'node') {
        console.warn('[otel-esbuild-plugin] platform is not "node"; plugin will still run but may be useless.');
      }

      build.onResolve({ filter }, (args) => {
        const resolved = requireResolve(args.path, args.resolveDir);
        return {
          path: resolved,
          namespace: 'splunk-otel-patched'
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'splunk-otel-patched' }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');

        const header = `
      /**
       * Auto-injected by otel-esbuild-plugin.
       * Ręczne patchowanie Expressa, bo require-in-the-middle nie działa w bundlu.
       */
      import * as __splunkOtel from '${sdkModule}';
      import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
      import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

      // (Opcjonalnie) włącz diagnostykę OTel
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

      (function () {
        const g = globalThis;
        if (!g['${onceGlobal}']) {
          const _start = __splunkOtel['${startFnName}'] || __splunkOtel.startTracing || __splunkOtel.start;
          if (typeof _start === 'function') {
            _start();
          } else {
            console.warn('[otel-esbuild-plugin] Cannot find start function on ${sdkModule}.');
          }
          g['${onceGlobal}'] = true;
        }
      })();

      // After execution, __expMod will hold the final exports
      // of the original Express module.
      let __expMod = {};
      (function (module, exports) {
      ${source}
      // CommonJS styl eksportów Expressa:
      __expMod = module.exports ?? exports.default ?? exports;
      })({ exports: {} }, {});
      console.log('[otel-esbuild-plugin] Express module:', __expMod);


      const __inst = new ExpressInstrumentation();
      __inst.enable();

      // 3) patch private instrumentation module definitions manually
      const __defs = __inst._modules;
      console.log('[otel-esbuild-plugin] Instrumentation modules:', __defs);
      if (Array.isArray(__defs)) {
        const def = __defs.find((d) => d.name === 'express');
        if (def && typeof def.patch === 'function') {
          try {
            def.patch(__expMod, 'express');
          } catch (e) {
            console.warn('[otel-esbuild-plugin] def.patch threw:', e);
          }
        } else {
          console.warn('[otel-esbuild-plugin] No patch function for express found.');
        }
      } else {
        console.warn('[otel-esbuild-plugin] _modules not found on instrumentation.');
      }

      // 4) Eksportuj spatchowany moduł
      export default __expMod;
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

function escapeRegex(lit: string): string {
  return lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireResolve(request: string, resolveDir: string): string {
  // ensure we resolve from the importing file directory, just like Node does
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const req = require as NodeJS.Require;
  return req.resolve(request, { paths: [resolveDir] });
}

function inferLoader(file: string): 'js' | 'ts' {
  const ext = path.extname(file);
  if (ext === '.ts' || ext === '.tsx') return 'ts';
  return 'js';
}
