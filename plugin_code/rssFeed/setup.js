var RssFeed = require('./app/models/rssFeed.js');

module.exports = function(app) {
  var rssFeed = new RssFeed();

  // Join Channels
  app.joinChannels(rssFeed.config.channelsToJoin);

  app.cmd('start', '', rssFeed.config.channels, rssFeed.config.channelsToExclude, rssFeed.readFeed);

};
