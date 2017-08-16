import Snoowrap from 'snoowrap';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';
const r = new Snoowrap(config.reddit);

class Popping {
  constructor() {
    this.config = config[env];
  }

  pop(client, { args }) {
    r.getRandomSubmission('popping').then(listing => {
      client.say(args[0], `NSFW! (most likely) ${listing[Math.floor(Math.random() * listing.length)].url}`);
    });
    return this;
  }
}

export default Popping;
