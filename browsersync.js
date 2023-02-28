
var browserSync = require('browser-sync').create();

browserSync.init({
  port: 4201,
  proxy: {
    target: "http://localhost:4200",
    ws: true,
    proxyReq: [
      function(proxyReq, req, res) {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      }
    ]
  },
  ui: false,
  open: false,
  logLevel: 'debug',
});