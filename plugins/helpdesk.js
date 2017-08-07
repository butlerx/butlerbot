const helpdesk = require('../plugin_code/helpdesk/setup.js');

exports.connect = (app, callback) => {
  helpdesk(app);
  callback();
};
