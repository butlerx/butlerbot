const _ = require('lodash');
const request = require('request-promise-native');

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.json')[env];

function RedbrickCommittee() {
  const self = this;

  self.config = config;

  self.committee = () =>
    new Promise((resolve, reject) => {
      request({
        uri    : 'http://redbrick.dcu.ie/api/committee',
        headers: {
          'User-Agent': 'Request-Promise',
        },
        json: true,
      })
        .then(cmt => resolve(cmt))
        .catch(error => reject(error));
    });

  self.showCommitteeInfo = (client, message, cmdArgs) => {
    client.say(message.args[0], 'Committee details sent. Who you want to tell to resign!');
    self.showChair(client, message, cmdArgs);
    self.showSecretary(client, message, cmdArgs);
    self.showTreasurer(client, message, cmdArgs);
    self.showPRO(client, message, cmdArgs);
    self.showEvents(client, message, cmdArgs);
    self.showFYR(client, message, cmdArgs);
    self.showWebmaster(client, message, cmdArgs);
    self.showHelpdesk(client, message, cmdArgs);
    self.showAdmins(client, message, cmdArgs);
  };

  self.showChair = async (client, { nick }) => {
    const cmt = await self.committee();
    const chairperson = _.find(cmt, { position: 'Chairperson' });
    if (!_.isUndefined(chairperson) && self.chair) {
      const chairString = `${chairperson.name} (${chairperson.nick})`;
      client.say(
        nick,
        `Chairperson: ${chairString} contact by /m ${chairperson.nick} <message>, or email ${chairperson.name}@redbrick.dcu.ie`,
      );
      self.wait('Chair');
    }
  };

  self.showSecretary = async (client, { nick }) => {
    const cmt = await self.committee();
    const secretary = _.find(cmt, { position: 'Secretary' });
    if (!_.isUndefined(secretary) && self.sec) {
      const secretaryString = `${secretary.name} (${secretary.nick})`;
      client.say(
        nick,
        `Secretary: ${secretaryString} contact by /m ${secretary.nick} <message>, or email ${secretary.nick}@redbrick.dcu.ie`,
      );
      self.wait('Sec');
    }
  };

  self.showTreasurer = async (client, { nick }) => {
    const cmt = await self.committee();
    const treasurer = _.find(cmt, { position: 'Treasurer' });
    if (!_.isUndefined(treasurer) && self.treasurer) {
      const treasurerString = `${treasurer.name} (${treasurer.nick})`;
      client.say(
        nick,
        `Treasurer: ${treasurerString} contact by /m ${treasurer.nick} <message>, or email ${treasurer.nick}@redbrick.dcu.ie`,
      );
      self.wait('Treasurer');
    }
  };

  self.showPRO = async (client, { nick }) => {
    const cmt = await self.committee();
    const pro = _.find(cmt, { position: 'Public Relations Officer' });
    if (!_.isUndefined(pro) && self.pro) {
      const proString = `${pro.name} (${pro.nick})`;
      client.say(
        nick,
        `Public Relations Officer: ${proString} contact by /m ${pro.nick} <message>, or email ${pro.nick}@redbrick.dcu.ie`,
      );
      self.wait('PRO');
    }
  };

  self.showEvents = async (client, { nick }) => {
    const cmt = await self.committee();
    const events = _.find(cmt, { position: 'Events Officer' });
    if (!_.isUndefined(events) && self.events) {
      const eventsString = `${events.name} (${events.nick})`;
      client.say(
        nick,
        `Events Officer: ${eventsString} contact by /m ${events.nick} <message>, or email ${events.nick}@redbrick.dcu.ie`,
      );
    }
  };

  self.showFYR = async (client, { nick }) => {
    const cmt = await self.committee();
    const firstYearRep = _.find(cmt, { position: 'First Year Representative' });
    if (!_.isUndefined(firstYearRep) && self.fyr) {
      const fyrString = `${firstYearRep.name} (${firstYearRep.nick})`;
      client.say(
        nick,
        `First Year Representative: ${fyrString} contact by /m ${firstYearRep.nick} <message>, or email ${firstYearRep.nick}@redbrick.dcu.ie`,
      );
    }
  };

  self.showWebmaster = async (client, { nick }) => {
    const cmt = await self.committee();
    const webmaster = _.find(cmt, { position: 'Webmaster' });
    if (!_.isUndefined(webmaster) && self.web) {
      const webmasterString = `${webmaster.name} (${webmaster.nick})`;
      client.say(
        nick,
        `Webmaster: ${webmasterString} contact by /m ${webmaster.nick} <message>, or email ${webmaster.nick}@redbrick.dcu.ie`,
      );
    }
  };

  self.showHelpdesk = async (client, args) => {
    const cmt = await self.committee();
    const helpdesk = _.filter(cmt, { position: 'Helpdesk' });
    if (!_.isUndefined(helpdesk) && self.helpdesk) {
      const helpdeskString = _.map(helpdesk, ({ name, nick }) => `${name} (${nick})`).join(', ');
      client.say(
        args.nick,
        `Helpdesk: ${helpdeskString} contact by emailing helpdesk@redbrick.dcu.ie`,
      );
    }
  };

  self.showAdmins = async (client, args) => {
    const cmt = await self.committee();
    const admins = _.filter(cmt, { position: 'System Administrator' });
    if (!_.isUndefined(admins) && self.admins) {
      const adminsString = _.map(admins, ({ name, nick }) => `${name} (${nick})`).join(', ');
      client.say(
        args.nick,
        `System Administrators: ${adminsString} contact by emailing admins@redbrick.dcu.ie`,
      );
    }
  };
}

module.exports = RedbrickCommittee;
