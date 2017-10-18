import Snoowrap from 'snoowrap';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

export default class Popping {
  constructor() {
    this.config = config[env];
    this.reddit = new Snoowrap(this.config.reddit);
  }

  async pop(client, { args }) {
    try {
      const listing = await this.reddit.getRandomSubmission('popping');
      client.say(
        args[0],
        `NSFW! (most likely) ${listing[Math.floor(Math.random() * listing.length)].url}`,
      );
    } catch (err) {
      console.error(err);
      client.say(args[0], 'Something went wrong');
    }
  }
}
