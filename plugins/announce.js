const announce = require('../plugin_code/announce/setup.js');

exports.connect = (app, callback) => {
  announce(app);
  callback();
};
