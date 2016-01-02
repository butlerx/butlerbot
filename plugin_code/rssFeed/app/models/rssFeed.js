var env = process.env.NODE_ENV || 'development',
    config = require('../../config/config.json')[env],
    FeedParser = require('feedparser'),
    request = require('request');

var RssFeed = function RssFeed() {
  var self = this;
  self.config = config;
  var req = request(self.config.rssFeed),
      feedparser = new FeedParser();

  self.readFeed = function (client, message, cmdArgs) {
    console.log('In readFeed');
    client.say(message.args[0], 'started feed for ' + self.config.rssFeed);
    req.on('error', function (error) {
      // handle any request errors
    });
    req.on('response', function (res) {
      var stream = this;

      if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

      stream.pipe(feedparser);
    });


    feedparser.on('error', function(error) {
      // always handle errors
    });
    feedparser.on('readable', function() {
      // This is where the action is!
      var stream = this
        , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
        , item;

      while (item = stream.read()) {
        client.say(message.args[0], item.title + ' ' + item.comments);
        console.log(item.title + ' ' + item.comments);
      }
    });
  };

  self.readFeed();
}

exports = module.exports = RssFeed;
