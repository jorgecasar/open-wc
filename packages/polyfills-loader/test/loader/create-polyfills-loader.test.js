const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { createPolyfillsLoader } = require('../../index');

const updateSnapshots = process.argv.includes('--update-snapshots');

function testSnapshot({ name, config }) {
  const snapshotPath = path.join(__dirname, 'snapshots', `${name}.js`);
  const script = createPolyfillsLoader(config);

  if (updateSnapshots) {
    fs.writeFileSync(snapshotPath, script, 'utf-8');
  } else {
    const snapshot = fs.readFileSync(snapshotPath, 'utf-8');
    expect(script).to.equal(snapshot);
  }
}

describe('loader-script', () => {
  it('generates a loader script with one module entries', () => {
    testSnapshot({
      name: 'module-entry',
      config: {
        entries: { type: 'module', files: ['app.js'] },
      },
    });
  });

  it('generates a loader script with multiple module entries', () => {
    testSnapshot({
      name: 'module-entries',
      config: { entries: { type: 'module', files: ['app.js', 'shared.js'] } },
    });
  });

  it('generates a loader script with one system entry', () => {
    testSnapshot({
      name: 'system-entry',
      config: { entries: { type: 'systemjs', files: ['app.js'] } },
    });
  });

  it('generates a loader script with multiple system entries', () => {
    testSnapshot({
      name: 'system-entries',
      config: { entries: { type: 'systemjs', files: ['app.js', 'shared.js'] } },
    });
  });

  it('generates a loader script with one script entry', () => {
    testSnapshot({
      name: 'script-entry',
      config: { entries: { type: 'script', files: ['app.js'] } },
    });
  });

  it('generates a loader script with multiple script entries', () => {
    testSnapshot({
      name: 'script-entries',
      config: { entries: { type: 'script', files: ['app.js', 'shared.js'] } },
    });
  });

  it('generates a loader script with module and legacy system entry', () => {
    testSnapshot({
      name: 'module-system-entry',
      config: {
        entries: { type: 'module', files: ['app.js'] },
        legacyEntries: { type: 'systemjs', files: ['legacy/app.js'] },
      },
    });
  });

  it('generates a loader script with script and legacy script entries', () => {
    testSnapshot({
      name: 'script-script-entries',
      config: {
        entries: { type: 'script', files: ['app.js', 'shared.js'] },
        legacyEntries: { type: 'script', files: ['legacy/app.js', 'legacy/shared.js'] },
      },
    });
  });

  it('generates a loader script with polyfills', () => {
    testSnapshot({
      name: 'polyfills',
      config: {
        entries: { type: 'module', files: ['app.js'] },
        polyfills: {
          coreJs: true,
          webcomponents: true,
          fetch: true,
        },
      },
    });
  });

  it('generates a loader script with legacy entries and polyfills', () => {
    testSnapshot({
      name: 'polyfills-legacy',
      config: {
        entries: { type: 'module', files: ['app.js', 'shared.js'] },
        legacyEntries: { type: 'systemjs', files: ['legacy/app.js', 'legacy/shared.js'] },
        polyfills: {
          coreJs: true,
          webcomponents: true,
          fetch: true,
        },
      },
    });
  });

  it('generates a loader script with upwards file path', () => {
    testSnapshot({
      name: 'upwards-file-path',
      config: {
        entries: { type: 'module', files: ['../app.js'] },
      },
    });
  });

  it('generates a loader script with an absolute file path', () => {
    testSnapshot({
      name: 'absolute-file-path',
      config: {
        entries: { type: 'module', files: ['/app.js'] },
      },
    });
  });

  it('generates a minified loader script', () => {
    testSnapshot({
      name: 'minified',
      config: {
        entries: { type: 'module', files: ['app.js', 'shared.js'] },
        legacyEntries: { type: 'systemjs', files: ['legacy/app.js', 'legacy/shared.js'] },
        polyfills: {
          minify: true,
          coreJs: true,
          webcomponents: true,
          fetch: true,
        },
      },
    });
  });

  it('generates a hashed loader script', () => {
    testSnapshot({
      name: 'hashed',
      config: {
        entries: { type: 'module', files: ['app.js', 'shared.js'] },
        polyfills: {
          hash: true,
          coreJs: true,
          webcomponents: true,
          fetch: true,
        },
      },
    });
  });
});
