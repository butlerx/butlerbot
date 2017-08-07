const bookclup = require('../plugin_code/bookclub/setup.js');

exports.connect = (app, callback) => {
  bookclup(app);
  callback();
};
