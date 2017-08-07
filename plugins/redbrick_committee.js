const cmt = require('../plugin_code/redbrick_committee/setup.js');

exports.connect = (app, callback) => {
  cmt(app);
  callback();
};
