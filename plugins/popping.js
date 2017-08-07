const pop = require('../plugin_code/popping/setup.js');

exports.connect = (app, callback) => {
  pop(app);
  callback();
};
