/* eslint-disable prefer-template */
const Terser = require('terser');
const { appEntryTypes } = require('../utils/constants');
const { cleanImportPath } = require('../utils/utils');
const { createPolyfillsData } = require('./create-polyfills-data');

/**
 * @typedef {object} AppEntries
 * @property {string} type
 * @property {string[]} files
 */

/**
 * @typedef {object} PolyfillsData
 * @property {string} name
 * @property {string} [test]
 * @property {string} code
 * @property {string} hash
 * @property {string} sourcemap
 */

/**
 * @typedef {object} PolyfillConfig
 * @property {string} name name of the polyfill
 * @property {string} path polyfill path
 * @property {string} [test] expression which should evaluate to true to load the polyfill
 * @property {boolean} [module] wether to load the polyfill with type module
 * @property {string} [sourcemapPath] polyfill sourcemaps path
 * @property {boolean} [noMinify] whether to minify the polyfills. default true if no sourcemap is given, false otherwise
 */

/**
 * @typedef {object} PolyfillsConfig
 * @property {PolyfillConfig[]} [custom] custom polyfills specified by the user
 * @property {boolean} [minify]
 * @property {boolean} [hash]
 * @property {boolean} [coreJs] whether to polyfill core-js polyfills
 * @property {boolean | string} [regeneratorRuntime] whether to add regenerator runtime
 * @property {boolean} [webcomponents] whether to polyfill webcomponents
 * @property {boolean} [fetch] whether to polyfill fetch
 * @property {boolean} [intersectionObserver] whether to polyfill intersection observer
 * @property {boolean} [dynamicImport] whether to polyfill dynamic import
 * @property {boolean} [systemJsExtended] whether to polyfill systemjs, extended version with import maps
 * @property {boolean} [esModuleShims] whether to polyfill es modules using es module shims
 */

/**
 * @typedef {object} PolyfillsLoaderConfig
 * @property {AppEntries} entries
 * @property {AppEntries} [legacyEntries]
 * @property {PolyfillsConfig} [polyfills]
 */

const loadScriptFunction = `
  function loadScript(src) {
    var loaded = false, thenCb, s = document.createElement('script');
    function resolve() {
      document.head.removeChild(s);
      thenCb ? thenCb() : loaded = true;
    }
    s.src = src; s.onload = resolve;
    s.onerror = function () {
      console.error('[polyfills-loader] failed to load script: ' + src + ' check the network tab for HTTP status.');
      resolve();
    }
    document.head.appendChild(script);
    return { then: function (cb) { loaded ? cb() : thenCb = cb; } };
  }\n\n`;

/**
 * @param {PolyfillsLoaderConfig} config
 * @param {PolyfillsData[]} polyfills
 * @returns {string}
 */
function createLoadScriptCode(config, polyfills) {
  const { entries, legacyEntries } = config;
  if (polyfills && polyfills.length > 0) {
    return loadScriptFunction;
  }

  if (entries.type === 'script' || (legacyEntries && legacyEntries.type === 'script')) {
    return loadScriptFunction;
  }

  return '';
}

const asArrayLiteral = arr => `[${arr.map(e => `'${e}'`).join(',')}]`;

const entryLoaderCreators = {
  [appEntryTypes.script]: files =>
    files.length === 1
      ? `loadScript('${files[0]}')`
      : `${asArrayLiteral(files)}.forEach(function (entry) { loadScript(entry); })`,
  [appEntryTypes.module]: files =>
    files.length === 1
      ? `window.importShim('${files[0]}')`
      : `${asArrayLiteral(files)}.forEach(function (entry) { window.importShim(entry); })`,
  [appEntryTypes.moduleShim]: files =>
    files.length === 1
      ? `window.importShim('${files[0]}')`
      : `${asArrayLiteral(files)}.forEach(function (entry) { window.importShim(entry); })`,
  [appEntryTypes.systemjs]: files =>
    files.length === 1
      ? `System.import('${files[0]}')`
      : `${asArrayLiteral(files)}.forEach(function (entry) { System.import(entry); })`,
};

/**
 * @param {AppEntries} entries
 * @param {AppEntries} legacyEntries
 */
function createEntriesLoaderCodeFunction(entries, legacyEntries) {
  if (!legacyEntries) {
    return `${entryLoaderCreators[entries.type](entries.files.map(cleanImportPath))};`;
  }

  const load = entryLoaderCreators[entries.type](entries.files.map(cleanImportPath));
  const loadLegacy = entryLoaderCreators[legacyEntries.type](
    legacyEntries.files.map(cleanImportPath),
  );
  return `'noModule' in HTMLScriptElement.prototype ? ${load} : ${loadLegacy};`;
}

/**
 * @param {PolyfillsLoaderConfig} config
 * @param {PolyfillsData[]} polyfills
 * @returns {string}
 */
function createEntriesLoaderCode(config, polyfills) {
  const { entries, legacyEntries } = config;
  const loadEntriesFunction = createEntriesLoaderCodeFunction(entries, legacyEntries);

  // create a separate loadEntries to be run after polyfills
  if (polyfills && polyfills.length > 0) {
    return `
  function loadEntries() {
    ${loadEntriesFunction}
  }

  polyfills.length ? Promise.all(polyfills).then(loadEntries) : loadEntries();\n`;
  }

  // there are no polyfills, load entries straight away
  return `${loadEntriesFunction}\n`;
}

/**
 * @param {PolyfillsLoaderConfig} config
 * @param {PolyfillsData[]} polyfills
 */
function createPolyfillsLoaderCode(config, polyfills) {
  if (!polyfills || polyfills.length === 0) {
    return '';
  }
  let code = '  var polyfills = [];\n';

  polyfills.forEach(polyfill => {
    const name = `${polyfill.name}${polyfill.hash ? `.${polyfill.hash}` : ''}.js`;
    const PolyfillsData = `polyfills.push(loadScript('polyfills/${name}'))`;

    if (polyfill.test) {
      code += `  if (${polyfill.test}) { ${PolyfillsData} }\n`;
    } else {
      code += `  ${PolyfillsData}\n`;
    }
  });

  return code;
}

/**
 * Creates a loader script that executed immediately.
 *
 * @param {PolyfillsLoaderConfig} config
 * @returns {string}
 */
function createPolyfillsLoader(config) {
  const polyfills = createPolyfillsData(config);

  const code =
    '\n(function() {\n' +
    createLoadScriptCode(config, polyfills) +
    createPolyfillsLoaderCode(config, polyfills) +
    createEntriesLoaderCode(config, polyfills) +
    '})();\n';

  return config.polyfills && config.polyfills.minify ? Terser.minify(code).code || code : code;
}

module.exports = {
  createPolyfillsLoader,
};
