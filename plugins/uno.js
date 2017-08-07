const uno = require('../plugin_code/uno/setup.js');

exports.connect = (app, callback) => {
  uno(app);
  callback();
};
