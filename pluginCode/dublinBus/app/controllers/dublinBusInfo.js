import _ from 'lodash';
import dBus from 'dublin-bus.js';
import config from '../../config/config.json';

function printBuses({ stop, buses }, client, channel) {
  client.say(channel, `Stop address: ${stop}`);
  buses.forEach(({ due, route, destination, expected }) => {
    client.say(
      channel,
      due === 'Due'
        ? `${route} to ${destination} is due now`
        : `${route} to ${destination} expected in ${due} min, at ${expected}`,
    );
  });
}

export default class DublinBusInfo {
  constructor() {
    this.config = config;
  }

  async showStopInfo(client, { args, nick }, cmdArgs) {
    const cmd = cmdArgs !== '' ? _.map(cmdArgs.match(/(\w+)\s?/gi), str => str.trim()) : cmdArgs;
    try {
      if (cmd.length < 1 || isNaN(cmd[0])) {
        client.say(args[0], `${nick}: Please supply a stop number.`);
      } else if (_.isUndefined(cmd[1])) {
        printBuses(await dBus.getStopInfo(cmd[0]), client, args[0]);
      } else {
        printBuses(await dBus.getStopInfoForBuses(cmd[0], cmd.splice(1)), client, args[0]);
      }
    } catch (reason) {
      client.say(args[0], `${nick}: Sorry, ${reason}.`);
    }
  }
}
