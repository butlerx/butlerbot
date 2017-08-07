const _ = require('lodash');
const dBus = require('dublin-bus.js');
const config = require('../../config/config.json');

const printBuses = ({ stop, buses }, client, channel) => {
  client.say(channel, `Stop address: ${stop}`);
  buses.forEach(({ due, route, destination, expected }) => {
    client.say(
      channel,
      due === 'Due'
        ? `${route} to ${destination} is due now`
        : `${route} to ${destination} expected in ${due} min, at ${expected}`,
    );
  });
};

function DublinBusInfo() {
  const self = this;
  self.config = config;

  self.showStopInfo = (client, { args, nick }, cmdArgs) => {
    const cmd = cmdArgs !== '' ? _.map(cmdArgs.match(/(\w+)\s?/gi), str => str.trim()) : cmdArgs;

    if (cmd.length < 1 || isNaN(cmd[0])) {
      client.say(args[0], `${nick}: Please supply a stop number.`);
    } else if (_.isUndefined(cmd[1])) {
      dBus
        .getStopInfo(cmd[0])
        .then(info => printBuses(info, client, args[0]))
        .catch(reason => client.say(args[0], `${nick}: Sorry, ${reason}.`));
    } else {
      dBus
        .getStopInfoForBuses(cmd[0], cmd.splice(1))
        .then(info => printBuses(info, client, args[0]))
        .catch(reason => client.say(args[0], `${nick}: Sorry, ${reason}.`));
    }
  };
}

module.exports = DublinBusInfo;
