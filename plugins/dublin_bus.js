const dBus = require('../plugin_code/dublin_bus/setup.js');

exports.connect = (app, callback) => {
  dBus(app);
  callback();
};
