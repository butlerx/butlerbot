import schedule from 'node-schedule';
import request from 'request-promise-native';
import moment from 'moment';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

function getLatestPost() {
  return request({
    uri: `${this.config.url}/posts`,
    headers: {
      'User-Agent': 'butlerbot',
    },
    json: true,
  }).then(posts => posts[0]);
}

export default class Announce {
  constructor(client) {
    this.config = config[env];
    this.post = null;
    this.client = client;
    schedule.scheduleJob(' */5 * * * *', this.update);
  }

  async update() {
    if (this.client !== null) {
      try {
        const post = await getLatestPost();
        if (!moment(post.date).isSameOrBefore(this.post.date)) {
          this.post = post;
          this.config.forEach((channel) => {
            this.client.setTopic(channel, `${post.title} - ${post.permalink}`);
          });
        }
        return;
      } catch (err) {
        console.error(err);
      }
    }
    console.log('update failed no client');
  }
}
