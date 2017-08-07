const Snoowrap = require('snoowrap');

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.json')[env];

const r = new Snoowrap(config.reddit);

function Popping() {
  const self = this;
  self.config = config;

  self.pop = (client, { args }) =>
    r.getRandomSubmission('popping')
      .then(listing => {
        client.say(args[0], `NSFW! (most likely) ${listing[Math.floor(Math.random() * listing.length)].url}`);
      });
}

module.exports = Popping;
