
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
  polyfills.push(loadScript('polyfills/systemjs.js'))

  function loadEntries() {
    System.import('./app.js');
  }

  polyfills.length ? Promise.all(polyfills).then(loadEntries) : loadEntries();
})();
