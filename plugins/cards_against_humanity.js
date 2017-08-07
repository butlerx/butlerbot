const cah = require('../plugin_code/cards_against_humanity/setup.js');

exports.connect = (app, callback) => {
  cah(app);
  callback();
};
