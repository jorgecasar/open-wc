
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
  if (!('noModule' in HTMLScriptElement.prototype)) { polyfills.push(loadScript('polyfills/core-js.js')) }
  if (!('fetch' in window)) { polyfills.push(loadScript('polyfills/fetch.js')) }
  if (!('attachShadow' in Element.prototype) || !('getRootNode' in Element.prototype)) { polyfills.push(loadScript('polyfills/webcomponents.js')) }
  if (!('noModule' in HTMLScriptElement.prototype) && 'getRootNode' in Element.prototype) { polyfills.push(loadScript('polyfills/custom-elements-es5-adapter.js')) }

  function loadEntries() {
    window.importShim('./app.js');
  }

  polyfills.length ? Promise.all(polyfills).then(loadEntries) : loadEntries();
})();
