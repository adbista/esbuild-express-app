
/**
 * Auto-injected by otel-esbuild-plugin.
 * Manually patching Express
 */
import * as __splunkOtel from '${sdkModule}';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

// After execution, __expMod will hold the final exports of the original Express module.
let __expMod = {};
(function (module) {
${source}
__expMod = module.exports;
})({ exports: {} });
//console.log('[otel-esbuild-plugin] Express module:', __expMod);

// Express instrumentation
const __inst = new ExpressInstrumentation();

// patch private instrumentation module definitions manually
const __defs = __inst._modules;
console.log('[otel-esbuild-plugin] Instrumentation modules:', __defs);
const def = __defs.find((d) => d.name === 'express');
try {
def.patch(__expMod, 'express');
} catch (e) {
console.warn('[otel-esbuild-plugin] def.patch threw:', e);
}

// export the patched module
export default __expMod;
      