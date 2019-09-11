const path = require('path');
const fs = require('fs');
const Terser = require('terser');
const { createContentHash } = require('../utils/utils');

const noModuleTest = "!('noModule' in HTMLScriptElement.prototype)";

/** @typedef {import('./create-polyfills-loader').PolyfillsLoaderConfig} PolyfillsLoaderConfig  */
/** @typedef {import('./create-polyfills-loader').PolyfillConfig} PolyfillConfig  */
/** @typedef {import('./create-polyfills-loader').PolyfillsData} PolyfillsData  */

/**
 * @param {PolyfillsLoaderConfig} config
 * @returns {PolyfillsData[]}
 */
function createPolyfillsData(config) {
  const { polyfills = {} } = config;

  /** @type {PolyfillConfig[]} */
  const polyfillConfigs = [...(polyfills.custom || [])];

  /**
   * @param {PolyfillConfig} polyfillConfig
   * @param {string} [pkg]
   */
  function addPolyfillConfig(polyfillConfig, pkg) {
    try {
      polyfillConfigs.push(polyfillConfig);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          `configured to polyfill ${polyfillConfig.name},` +
            ` but no polyfills found. Install with "npm i -D ${pkg || polyfillConfig.name}"`,
        );
      }

      throw error;
    }
  }

  if (polyfills.coreJs) {
    addPolyfillConfig(
      {
        name: 'core-js',
        test: noModuleTest,
        path: require.resolve('core-js-bundle/minified.js'),
        sourcemapPath: require.resolve('core-js-bundle/minified.js'),
      },
      'core-js-bundle',
    );
  }

  if (polyfills.regeneratorRuntime) {
    addPolyfillConfig({
      name: 'regenerator-runtime',
      test: polyfills.regeneratorRuntime !== 'always' ? noModuleTest : null,
      path: require.resolve('regenerator-runtime/runtime'),
    });
  }

  if (polyfills.fetch) {
    addPolyfillConfig(
      {
        name: 'fetch',
        test: "!('fetch' in window)",
        path: require.resolve('whatwg-fetch/dist/fetch.umd.js'),
      },
      'whatwg-fetch',
    );
  }

  // load systemjs, an es module polyfill, if one of the entries needs it
  if (
    [config.entries.type, config.legacyEntries && config.legacyEntries.type].includes('systemjs')
  ) {
    const name = 'systemjs';
    // if only legacy is systemjs, use a nomodule test to load it
    const test = config.entries.type === 'systemjs' ? null : noModuleTest;

    if (polyfills.systemJsExtended) {
      // full systemjs, including import maps polyfill
      addPolyfillConfig({
        name,
        test,
        path: require.resolve('systemjs/dist/system.min.js'),
        sourcemapPath: require.resolve('systemjs/dist/system.min.js.map'),
      });
    } else {
      // plain systemjs as es module polyfill
      addPolyfillConfig({
        name,
        test,
        path: require.resolve('systemjs/dist/s.min.js'),
        sourcemapPath: require.resolve('systemjs/dist/s.min.js.map'),
      });
    }
  }

  if (polyfills.dynamicImport) {
    addPolyfillConfig({
      name: 'dynamic-import',
      /**
       * dynamic import is syntax, not an actual function so we cannot feature detect it without using an import statement.
       * using a dynamic import on a browser which doesn't support it throws a syntax error and prevents the entire script
       * from being run, so we need to dynamically create and execute a function and catch the error. this is not CSP
       * compliant, but neither is the dynamic import polyfill so that's OK in this case
       */
      test:
        "'noModule' in HTMLScriptElement.prototype && (function () { try { Function('window.importShim = s => import(s);').call(); return true; } catch (_) { return false } })()",
      path: require.resolve('./dynamic-import-polyfill.js'),
    });
  }

  if (polyfills.esModuleShims) {
    addPolyfillConfig({
      name: 'es-module-shims',
      test: "'noModule' in HTMLScriptElement.prototype",
      path: require.resolve('es-module-shims/dist/es-module-shims.min.js'),
      sourcemapPath: require.resolve('es-module-shims/dist/es-module-shims.min.js.map'),
      module: true,
    });
  }

  if (polyfills.intersectionObserver) {
    addPolyfillConfig({
      name: 'intersection-observer',
      test:
        "!('IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype)",
      path: require.resolve('intersection-observer/intersection-observer.js'),
    });
  }

  if (polyfills.webcomponents) {
    addPolyfillConfig(
      {
        name: 'webcomponents',
        test: "!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype)",
        path: require.resolve('@webcomponents/webcomponentsjs/webcomponents-bundle.js'),
        sourcemapPath: require.resolve(
          '@webcomponents/webcomponentsjs/webcomponents-bundle.js.map',
        ),
      },
      '@webcomponents/webcomponentsjs',
    );

    // If a browser does not support nomodule attribute, but does support custom elements, we need
    // to load the custom elements es5 adapter. This is the case for Safari 10.1
    addPolyfillConfig(
      {
        name: 'custom-elements-es5-adapter',
        test: "!('noModule' in HTMLScriptElement.prototype) && 'getRootNode' in Element.prototype",
        path: require.resolve('@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js'),
      },
      '@webcomponents/webcomponentsjs',
    );
  }

  return polyfillConfigs.map(polyfillConfig => {
    if (!polyfillConfig.name || !polyfillConfig.path) {
      throw new Error(`A polyfill should have a name and a path property.`);
    }

    const codePath = path.resolve(polyfillConfig.path);
    if (!codePath || !fs.existsSync(codePath) || !fs.statSync(codePath).isFile()) {
      throw new Error(`Could not find a file at ${polyfillConfig.path}`);
    }

    let code = fs.readFileSync(codePath, 'utf-8');
    /** @type {string} */
    let sourcemap;
    if (polyfillConfig.sourcemapPath) {
      const sourcemapPath = path.resolve(polyfillConfig.sourcemapPath);
      if (!sourcemapPath || !fs.existsSync(sourcemapPath) || !fs.statSync(sourcemapPath).isFile()) {
        throw new Error(`Could not find a file at ${polyfillConfig.sourcemapPath}`);
      }

      sourcemap = fs.readFileSync(sourcemapPath, 'utf-8');
      // minify only if there were no source maps, and if not disabled explicitly
    } else if (polyfills.minify) {
      const minifyResult = Terser.minify(code, { sourceMap: true });
      // @ts-ignore
      ({ code, map: sourcemap } = minifyResult);
    }

    return {
      name: polyfillConfig.name,
      test: polyfillConfig.test,
      hash: polyfills.hash ? createContentHash(code) : null,
      code,
      sourcemap,
    };
  });
}

module.exports = {
  createPolyfillsData,
};
