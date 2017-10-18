import _ from 'lodash';
import Game from '../models/game';
import Player from '../models/player';

import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

export default class Uno {
  constructore() {
    this.config = config[env];
  }

  cards(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    const player = this.game.getPlayer({ nick });
    this.game.showCards(player);
  }

  challenge(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    this.game.challenge(nick);
  }

  draw(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    this.game.draw(nick);
  }

  end(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    this.game.endTurn(nick);
  }

  join(client, { args, nick, user, host }, cmdArgs) {
    const channel = args[0];
    let cmd = cmdArgs;
    if (cmd !== '') cmd = _.invokeMap(cmd.match(/(\w+)\s?/gi), str => str.trim());

    if (
      !_.isUndefined(this.game) &&
      this.game.state !== Game.STATES.STOPPED &&
      this.game.state !== Game.STATES.FINISHED &&
      this.game.state !== Game.STATES.WAITING
    ) {
      client.say(channel, `${nick}: Cannot join games that are already in progress.`);
      return false;
    }

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.FINISHED) {
      this.game = new Game(args[0], client, this.config, cmd);
    }

    const player = new Player(nick, user, host);
    this.game.addPlayer(player);
  }

  quit(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state === Game.STATES.FINISHED) return false;
    this.game.removePlayer(nick);
  }

  score() {
    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) return false;
    this.game.showScores();
  }

  start(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.WAITING) return false;
    this.game.start(nick);
  }

  stop(client, { nick }) {
    if (_.isUndefined(this.game) || this.game.state === Game.STATES.FINISHED) return false;
    if (_.isUndefined(this.game.getPlayer({ nick }))) return false;
    this.game.stop(nick);
  }

  play(client, { nick }, cmdArgs) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    const args = _.invokeMap(cmdArgs.match(/(\w+)\s?/gi), str => str.trim());
    this.game.play(nick, args[0], args[1]);
  }

  uno(client, { nick }, cmdArgs) {
    if (_.isUndefined(this.game) || this.game.state !== Game.STATES.PLAYABLE) return false;
    const args = _.invokeMap(cmdArgs.match(/(\w+)\s?/gi), str => str.trim());
    this.game.uno(nick, args[0], args[1]);
  }

  status(client, { args }) {
    const channel = args[0];
    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !j.');
    } else {
      this.game.showStatus();
    }
  }

  wiki(client, { args, nick }) {
    if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(nick, 'https://github.com/butlerx/butlerbot/wiki/Uno');
    } else {
      client.say(args[0], `${nick}: https://github.com/butlerx/butlerbot/wiki/Uno`);
    }
    return this;
  }
}
