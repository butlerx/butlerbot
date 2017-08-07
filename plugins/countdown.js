const countdown = require('../plugin_code/countdown/setup.js');

exports.connect = (app, callback) => {
  countdown(app);
  callback();
};
