import _ from 'lodash';
import request from 'request-promise-native';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class RedbrickCommittee {
  constructor() {
    this.config = config[env];
    this.postions = config.position;
  }

  committee() {
    return request({
      uri    : this.config.url,
      headers: {
        'User-Agent': 'Request-Promise',
      },
      json: true,
    });
  }

  async showCommitteeInfo(client, { nick, args }) {
    client.say(args[0], 'Committee details sent. So you can tell them to resign!');
    try {
      const cmt = await this.committee();
      this.postions.forEach(position => this.show(client, nick, position, cmt));
    } catch (err) {
      console.error(err);
    }
  }

  async show(client, nick, position, cmtArg) {
    try {
      const cmt = _.isUndefined(cmtArg) ? await this.committee() : cmtArg;
      const memebers = _.filter(cmt, { position });
      if (!_.isUndefined(memebers)) {
        memebers.forEach(memeber => {
          client.say(
            nick,
            `${position}: ${memeber.name} (${memeber.nick}) contact by /m ${memeber.nick} <message>, or email ${memeber.name}@redbrick.dcu.ie`,
          );
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  showChair(client, { nick, args }) {
    client.say(args[0], 'Chairperson details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Chairperson');
  }

  showSecretary(client, { nick, args }) {
    client.say(args[0], 'Secretary details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Secretary');
  }

  showTreasurer(client, { nick, args }) {
    client.say(args[0], 'Treasurer details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Treasurer');
  }

  showPRO(client, { nick, args }) {
    client.say(args[0], 'PRO details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Public Relations Officer');
  }

  showEvents(client, { nick, args }) {
    client.say(args[0], 'Events details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Events Officer');
  }

  showFYR(client, { nick, args }) {
    client.say(args[0], 'First year Reps details sent. So you can tell them to resign!');
    return this.show(client, nick, 'First Year Representative');
  }

  showWebmaster(client, { nick, args }) {
    client.say(args[0], 'Webmaster details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Webmaster');
  }

  showHelpdesk(client, { nick, args }) {
    client.say(args[0], 'Helpdesk details sent. So you can tell them to resign!');
    return this.show(client, nick, 'Helpdesk');
  }

  showAdmins(client, { nick, args }) {
    client.say(args[0], 'Admins details sent. So you can tell them to resign!');
    return this.show(client, nick, 'System Administrator');
  }
}

export default RedbrickCommittee;
