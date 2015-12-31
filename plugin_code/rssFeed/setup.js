var RssFeed = require('./app/controllers/rssFeed.js');

module.exports = function(app) {
  var rssFeed = new RssFeed();

  // Join Channels
  app.joinChannels(rssFeed.config.channelsToJoin);

};
