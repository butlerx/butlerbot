var env = process.env.NODE_ENV || 'development',
    config = require('../../config/config.json')[env];

var RssFeed = function RssFeed() {
  var self = this;
  self.config = config;
  self.fileName ='plugin_code/popping/config/url.json';

  self.read = function (client, message, cmdArgs) {

  };
}

exports = module.exports = RssFeed;
