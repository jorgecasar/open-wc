
(function() {

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
  }

  var polyfills = [];
  if (!('noModule' in HTMLScriptElement.prototype)) { polyfills.push(loadScript('polyfills/core-js.8e88fc5b880b02431d6fad7b3a34116d.js')) }
  if (!('fetch' in window)) { polyfills.push(loadScript('polyfills/fetch.8c78815e37189a88a5ccc668ab31698f.js')) }
  if (!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype)) { polyfills.push(loadScript('polyfills/webcomponents.88b4b5855ede008ecad6bbdd4a69e57d.js')) }
  if (!('noModule' in HTMLScriptElement.prototype) && 'getRootNode' in Element.prototype) { polyfills.push(loadScript('polyfills/custom-elements-es5-adapter.01496319407efe7ef743b10afbb93714.js')) }

  function loadEntries() {
    ['./app.js','./shared.js'].forEach(function (entry) { window.importShim(entry); });
  }

  polyfills.length ? Promise.all(polyfills).then(loadEntries) : loadEntries();
})();
