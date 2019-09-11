const path = require('path');
const { expect } = require('chai');
const { createPolyfillsData } = require('../../src/loader/create-polyfills-data');

describe('polyfills', () => {
  it('returns the correct polyfills data', () => {
    const config = {
      entries: { type: 'module', files: [] },
      legacyEntries: { type: 'module', files: [] },
      polyfills: {
        minify: true,
        hash: true,
        coreJs: true,
        webcomponents: true,
        fetch: true,
        intersectionObserver: true,
      },
    };

    const polyfills = createPolyfillsData(config);
    const polyfillsWithoutCode = polyfills.map(p => ({
      ...p,
      code: undefined,
      hash: undefined,
      sourcemap: undefined,
    }));

    expect(polyfillsWithoutCode).to.eql([
      {
        code: undefined,
        name: 'core-js',
        hash: undefined,
        sourcemap: undefined,
        test: "!('noModule' in HTMLScriptElement.prototype)",
      },
      {
        code: undefined,
        name: 'fetch',
        hash: undefined,
        sourcemap: undefined,
        test: "!('fetch' in window)",
      },
      {
        code: undefined,
        name: 'intersection-observer',
        hash: undefined,
        sourcemap: undefined,
        test:
          "!('IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype)",
      },
      {
        code: undefined,
        name: 'webcomponents',
        hash: undefined,
        sourcemap: undefined,
        test: "!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype)",
      },
      {
        code: undefined,
        name: 'custom-elements-es5-adapter',
        hash: undefined,
        sourcemap: undefined,
        test: "!('noModule' in HTMLScriptElement.prototype) && 'getRootNode' in Element.prototype",
      },
    ]);

    polyfills.forEach(polyfill => {
      expect(polyfill.code).to.be.a('string');
      expect(polyfill.hash).to.be.a('string');
      expect(polyfill.sourcemap).to.be.a('string');
    });
  });

  it('handles systemjs legacy entry', () => {
    const config = {
      entries: { type: 'module', files: [] },
      legacyEntries: { type: 'systemjs', files: [] },
      minify: true,
    };

    const polyfills = createPolyfillsData(config);
    const polyfillsWithoutCode = polyfills.map(p => ({
      ...p,
      hash: undefined,
      code: undefined,
      sourcemap: undefined,
    }));

    expect(polyfillsWithoutCode).to.eql([
      {
        code: undefined,
        name: 'systemjs',
        hash: undefined,
        test: "!('noModule' in HTMLScriptElement.prototype)",
        sourcemap: undefined,
      },
    ]);
  });

  it('handles systemjs modern', () => {
    const config = {
      entries: { type: 'systemjs', files: [] },
      minify: true,
    };

    const polyfills = createPolyfillsData(config);
    const polyfillsWithoutCode = polyfills.map(p => ({
      ...p,
      hash: undefined,
      code: undefined,
      sourcemap: undefined,
    }));

    expect(polyfillsWithoutCode).to.eql([
      {
        code: undefined,
        name: 'systemjs',
        hash: undefined,
        test: null,
        sourcemap: undefined,
      },
    ]);
  });

  it('can load custom polyfills', () => {
    const custom = [
      {
        name: 'polyfill-a',
        test: "'foo' in window",
        path: path.resolve(__dirname, 'custom-polyfills/polyfill-a.js'),
      },
      {
        name: 'polyfill-b',
        nomodule: true,
        path: path.resolve(__dirname, 'custom-polyfills/polyfill-b.js'),
        sourcemapPath: path.resolve(__dirname, 'custom-polyfills/polyfill-b.js.map'),
      },
    ];
    const config = {
      entries: { type: 'module', files: [] },
      legacyEntries: { type: 'module', files: [] },
      polyfills: {
        minify: true,
        hash: true,
        coreJs: true,
        webcomponents: false,
        fetch: false,
        intersectionObserver: false,
        custom,
      },
    };

    const polyfills = createPolyfillsData(config);
    const polyfillsWithoutCode = polyfills.map(p => ({
      ...p,
      code: undefined,
      hash: undefined,
      sourcemap: undefined,
    }));

    expect(polyfillsWithoutCode).to.eql([
      {
        code: undefined,
        name: 'polyfill-a',
        hash: undefined,
        sourcemap: undefined,
        test: "'foo' in window",
      },
      {
        code: undefined,
        name: 'polyfill-b',
        hash: undefined,
        sourcemap: undefined,
        test: undefined,
      },
      {
        code: undefined,
        name: 'core-js',
        test: "!('noModule' in HTMLScriptElement.prototype)",
        hash: undefined,
        sourcemap: undefined,
      },
    ]);

    polyfills.forEach(polyfill => {
      expect(polyfill.code).to.be.a('string');
      expect(polyfill.hash).to.be.a('string');
      expect(polyfill.sourcemap).to.be.a('string');
    });
  });
});
