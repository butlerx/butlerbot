import Snoowrap from 'snoowrap';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class Popping {
  constructor() {
    this.config = config[env];
    this.reddit = new Snoowrap(this.config.reddit);
  }

  pop(client, { args }) {
    this.reddit.getRandomSubmission('popping').then(listing => {
      client.say(args[0], `NSFW! (most likely) ${listing[Math.floor(Math.random() * listing.length)].url}`);
    });
  }
}

export default Popping;
