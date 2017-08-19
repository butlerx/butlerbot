import _ from 'lodash';
import Game from './game';
import Player from '../models/player';
import config from '../../config';
import dbModels from '../../models';

/** Class for Cards Against Humanity Plugin */
class CardsAgainstHumanity {
  /**
   * Initialise Plugin
   */
  constructor() {
    this.config = config;
    this.wikiUrl = 'https://github.com/butlerx/butlerbot/wiki/Cards-Against-Humanity';
  }

  /**
   * Start a game
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
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
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   */
  status(client, { args }) {
    const channel = args[0];

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      this.game.showStatus();
    }
  }

  /**
   * Pick a winning command if CardZar
   * Pick a card to Play if a Player
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
   */
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

  /**
   * Discard a card from players hand
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   * @param {string} cmd Command Arguements
   */
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

  /**
   * Link to wiki on how to interact with bot
   * @param {Object} client IRC Client
   * @param {Object} message Raw message from IRC server
   */
  wiki(client, { args, nick }) {
    if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(nick, this.wikiUrl);
    } else {
      client.say(args[0], `${nick}: ${this.wikiUrl}`);
    }
  }
}

export default CardsAgainstHumanity;
