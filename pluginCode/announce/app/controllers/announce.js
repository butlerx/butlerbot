import schedule from 'node-schedule';
import request from 'request-promise-native';
import moment from 'moment';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class Announce {
  constructor(client) {
    this.config = config[env];
    this.post = null;
    schedule.scheduleJob(' */5 * * * *', () => {
      if (client !== null) {
        console.log('Scheduled update');
        this.getLatestPost()
          .then(post => {
            if (!moment(post.date).isSameOrBefore(this.post.date)) {
              this.post = post;
              this.config.forEach(channel => {
                client.setTopic(channel, `${post.title} - ${post.permalink}`);
              });
            }
          })
          .catch(console.log);
      } else {
        console.log('update failed');
      }
    });
  }

  getLatestPost() {
    return new Promise((resolve, reject) => {
      request({
        uri    : `${this.config.url}/posts`,
        headers: {
          'User-Agent': 'butlerbot',
        },
        json: true,
      })
        .then(posts => resolve(posts[0]))
        .catch(error => reject(error));
    });
  }
}

export default Announce;
