import _ from 'lodash';
import Game from './game';
import Player from '../models/player';
import config from '../../config';
import dbModels from '../../models';

class CardsAgainstHumanity {
  constructor() {
    this.config = config;
  }

  /**
     * Start a game
     * @param client
     * @param message
     * @param cmd
     */
  start(client, message, cmd) {
    // check if game running on the channel
    const channel = message.args[0];
    const nick = message.nick;
    const user = message.user;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (!_.isUndefined(this.game) && this.game.state !== Game.STATES.STOPPED) {
      // game exists
      client.say(channel, 'A game is already running. Type !join to join the game.');
    } else {
      // init game
      const player = new Player(nick, user, hostname);
      const newGame = new Game(channel, client, this.config, cmdArgs, dbModels);
      this.game = newGame;
      this.game.addPlayer(player);
    }
  }

  /**
     * Stop a game
     * @param client
     * @param message
     * @param cmdArgs
     */
  stop(client, message) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(this.game.getPlayer({ nick, hostname }))) {
      this.game.stop(this.game.getPlayer({ nick, hostname }));
      this.game = undefined;
    }
  }

  /**
     * Pause a game
     * @param client
     * @param message
     */
  pause(client, message) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(this.game.getPlayer({ nick, hostname }))) {
      this.game.pause();
    }
  }

  /**
     * Resume a game
     * @param client
     * @param message
     * @param cmdArgs
     */
  resume(client, message) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(this.game.getPlayer({ nick, hostname }))) {
      this.game.resume();
    }
  }

  /**
     * Add player to game
     * @param client
     * @param message
     */
  join(client, message, cmd) {
    const nick = message.nick;
    const user = message.user;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      this.start(client, message, cmdArgs);
    } else {
      const player = new Player(nick, user, hostname);
      this.game.addPlayer(player);
    }
  }

  /**
     * Remove player from game
     * @param client
     * @param message
     */
  quit(client, message) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      this.game.removePlayer(this.game.getPlayer({ nick, hostname }));
    }
  }

  /**
     * Get players cards
     * @param client
     * @param message
     */
  cards(client, message) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = this.game.getPlayer({ nick, hostname });
      this.game.showCards(player);
    }
  }

  /**
     * Play cards
     * @param client
     * @param message
     */
  play(client, message, cmd) {
    // check if everyone has played and end the round
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = this.game.getPlayer({ nick, hostname });
      if (!_.isUndefined(player)) {
        this.game.playCard(cmdArgs, player);
      }
    }
  }

  /**
     * List players in the game
     * @param client
     * @param message
     */
  list(client, { args }) {
    const channel = args[0];

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      this.game.listPlayers();
    }
  }

  /**
     * Select the winner
     * @param client
     * @param message
     * @param cmd
     */
  winner(client, message, cmd) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = this.game.getPlayer({ nick, hostname });
      if (!_.isUndefined(player)) {
        this.game.selectWinner(cmdArgs[0], player);
      }
    }
  }

  /**
     * Show top players in current game
     * @param client
     * @param message
     */
  points(client, { args }) {
    const channel = args[0];

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      this.game.showPoints();
    }
  }

  /**
     * Show top players in current game
     * @param client
     * @param message
     */
  status(client, { args }) {
    const channel = args[0];

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      this.game.showStatus();
    }
  }

  pick(client, message, cmd) {
    // check if everyone has played and end the round
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = this.game.getPlayer({ nick, hostname });

      if (!_.isUndefined(player)) {
        if (this.game.state === Game.STATES.PLAYED && channel === this.game.channel) {
          this.game.selectWinner(cmdArgs[0], player);
        } else if (this.game.state === Game.STATES.PLAYABLE) {
          this.game.playCard(cmdArgs, player);
        } else {
          client.say(channel, '!pick command not available in current state.');
        }
      }
    }
  }

  discard(client, message, cmd) {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start');
    } else {
      const player = this.game.getPlayer({ nick, hostname });

      if (this.game.state === Game.STATES.PLAYABLE) {
        this.game.discard(cmdArgs, player);
      } else {
        client.say(channel, '!discard command not available in current state');
      }
    }
  }

  wiki(client, { args, nick }) {
    if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(nick, 'https://github.com/butlerx/butlerbot/wiki/Cards-Against-Humanity');
    } else {
      client.say(
        args[0],
        `${nick}: https://github.com/butlerx/butlerbot/wiki/Cards-Against-Humanity`,
      );
    }
    return this;
  }
}

export default CardsAgainstHumanity;
