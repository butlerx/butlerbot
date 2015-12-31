exports.connect = function(app, callback) {
  require('../plugin_code/rssFeed/setup.js')(app);
  callback();
}
