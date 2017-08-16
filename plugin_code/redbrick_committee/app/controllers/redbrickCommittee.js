import _ from 'lodash';
import request from 'request-promise-native';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class RedbrickCommittee {
  constructor() {
    this.config = config[env];
  }

  committee() {
    return new Promise((resolve, reject) => {
      request({
        uri    : this.config.url,
        headers: {
          'User-Agent': 'Request-Promise',
        },
        json: true,
      })
        .then(cmt => resolve(cmt))
        .catch(error => reject(error));
    });
  }

  showCommitteeInfo(client, message, cmdArgs) {
    client.say(message.args[0], 'Committee details sent. Who you want to tell to resign!');
    this.showChair(client, message, cmdArgs);
    this.showSecretary(client, message, cmdArgs);
    this.showTreasurer(client, message, cmdArgs);
    this.showPRO(client, message, cmdArgs);
    this.showEvents(client, message, cmdArgs);
    this.showFYR(client, message, cmdArgs);
    this.showWebmaster(client, message, cmdArgs);
    this.showHelpdesk(client, message, cmdArgs);
    this.showAdmins(client, message, cmdArgs);
  }

  async showChair(client, { nick }) {
    const cmt = await this.committee();
    const chairperson = _.find(cmt, { position: 'Chairperson' });
    if (!_.isUndefined(chairperson) && this.chair) {
      const chairString = `${chairperson.name} (${chairperson.nick})`;
      client.say(
        nick,
        `Chairperson: ${chairString} contact by /m ${chairperson.nick} <message>, or email ${chairperson.name}@redbrick.dcu.ie`,
      );
      this.wait('Chair');
    }
  }

  async showSecretary(client, { nick }) {
    const cmt = await this.committee();
    const secretary = _.find(cmt, { position: 'Secretary' });
    if (!_.isUndefined(secretary) && this.sec) {
      const secretaryString = `${secretary.name} (${secretary.nick})`;
      client.say(
        nick,
        `Secretary: ${secretaryString} contact by /m ${secretary.nick} <message>, or email ${secretary.nick}@redbrick.dcu.ie`,
      );
      this.wait('Sec');
    }
  }

  async showTreasurer(client, { nick }) {
    const cmt = await this.committee();
    const treasurer = _.find(cmt, { position: 'Treasurer' });
    if (!_.isUndefined(treasurer) && this.treasurer) {
      const treasurerString = `${treasurer.name} (${treasurer.nick})`;
      client.say(
        nick,
        `Treasurer: ${treasurerString} contact by /m ${treasurer.nick} <message>, or email ${treasurer.nick}@redbrick.dcu.ie`,
      );
      this.wait('Treasurer');
    }
  }

  async showPRO(client, { nick }) {
    const cmt = await this.committee();
    const pro = _.find(cmt, { position: 'Public Relations Officer' });
    if (!_.isUndefined(pro) && this.pro) {
      const proString = `${pro.name} (${pro.nick})`;
      client.say(
        nick,
        `Public Relations Officer: ${proString} contact by /m ${pro.nick} <message>, or email ${pro.nick}@redbrick.dcu.ie`,
      );
      this.wait('PRO');
    }
  }

  async showEvents(client, { nick }) {
    const cmt = await this.committee();
    const events = _.find(cmt, { position: 'Events Officer' });
    if (!_.isUndefined(events) && this.events) {
      const eventsString = `${events.name} (${events.nick})`;
      client.say(
        nick,
        `Events Officer: ${eventsString} contact by /m ${events.nick} <message>, or email ${events.nick}@redbrick.dcu.ie`,
      );
    }
  }

  async showFYR(client, { nick }) {
    const cmt = await this.committee();
    const firstYearRep = _.find(cmt, { position: 'First Year Representative' });
    if (!_.isUndefined(firstYearRep) && this.fyr) {
      const fyrString = `${firstYearRep.name} (${firstYearRep.nick})`;
      client.say(
        nick,
        `First Year Representative: ${fyrString} contact by /m ${firstYearRep.nick} <message>, or email ${firstYearRep.nick}@redbrick.dcu.ie`,
      );
    }
  }

  async showWebmaster(client, { nick }) {
    const cmt = await this.committee();
    const webmaster = _.find(cmt, { position: 'Webmaster' });
    if (!_.isUndefined(webmaster) && this.web) {
      const webmasterString = `${webmaster.name} (${webmaster.nick})`;
      client.say(
        nick,
        `Webmaster: ${webmasterString} contact by /m ${webmaster.nick} <message>, or email ${webmaster.nick}@redbrick.dcu.ie`,
      );
    }
  }

  async showHelpdesk(client, { nick }) {
    const cmt = await this.committee();
    const helpdesk = _.filter(cmt, { position: 'Helpdesk' });
    if (!_.isUndefined(helpdesk) && this.helpdesk) {
      const helpdeskString = _.map(helpdesk, ({ name, nick }) => `${name} (${nick})`).join(', ');
      client.say(nick, `Helpdesk: ${helpdeskString} contact by emailing helpdesk@redbrick.dcu.ie`);
    }
  }

  async showAdmins(client, { nick }) {
    const cmt = await this.committee();
    const admins = _.filter(cmt, { position: 'System Administrator' });
    if (!_.isUndefined(admins) && this.admins) {
      const adminsString = _.map(admins, ({ name, nick }) => `${name} (${nick})`).join(', ');
      client.say(
        nick,
        `System Administrators: ${adminsString} contact by emailing admins@redbrick.dcu.ie`,
      );
    }
  }
}

export default RedbrickCommittee;
