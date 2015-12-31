var env = process.env.NODE_ENV || 'development',
    config = require('../../config/config.json')[env],
    FeedParser = require('feedparser'),
    request = require('request');

var RssFeed = function RssFeed() {
  var self = this;
  self.config = config;
  self.req = request(self.config.rssFeed);
  self.feedparser = new FeedParser();

  self.readFeed = function (client, message, cmdArgs) {
    self.req.on('error', function (error) {
      // handle any request errors
    });
    self.req.on('response', function (res) {
      var stream = this;

      if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

      stream.pipe(self.feedparser);
    });


    self.feedparser.on('error', function(error) {
      // always handle errors
    });
    self.feedparser.on('readable', function() {
      // This is where the action is!
      var stream = this
        , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
        , item;

      while (item = stream.read()) {
        client.say(message.args[0], item.title + ' ' + item.comments);
      }
    });
  };
}

exports = module.exports = RssFeed;
