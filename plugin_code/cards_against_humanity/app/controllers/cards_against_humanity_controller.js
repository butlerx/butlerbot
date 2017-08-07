const _ = require('lodash');
const Game = require('./game');
const Player = require('../models/player');
const config = require('../../config/config');
const dbModels = require('../../models');

function CardsAgainstHumanity() {
  const self = this;
  self.config = config;

  /**
     * Start a game
     * @param client
     * @param message
     * @param cmd
     */
  self.start = (client, message, cmd) => {
    // check if game running on the channel
    const channel = message.args[0];
    const nick = message.nick;
    const user = message.user;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (!_.isUndefined(self.game) && self.game.state !== Game.STATES.STOPPED) {
      // game exists
      client.say(channel, 'A game is already running. Type !join to join the game.');
    } else {
      // init game
      const player = new Player(nick, user, hostname);
      const newGame = new Game(channel, client, self.config, cmdArgs, dbModels);
      self.game = newGame;
      self.game.addPlayer(player);
    }
  };

  /**
     * Stop a game
     * @param client
     * @param message
     * @param cmdArgs
     */
  self.stop = (client, message) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(self.game.getPlayer({ nick, hostname }))) {
      self.game.stop(self.game.getPlayer({ nick, hostname }));
      self.game = undefined;
    }
  };

  /**
     * Pause a game
     * @param client
     * @param message
     */
  self.pause = (client, message) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(self.game.getPlayer({ nick, hostname }))) {
      self.game.pause();
    }
  };

  /**
     * Resume a game
     * @param client
     * @param message
     * @param cmdArgs
     */
  self.resume = (client, message) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else if (!_.isUndefined(self.game.getPlayer({ nick, hostname }))) {
      self.game.resume();
    }
  };

  /**
     * Add player to game
     * @param client
     * @param message
     */
  self.join = (client, message, cmd) => {
    const nick = message.nick;
    const user = message.user;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      self.start(client, message, cmdArgs);
    } else {
      const player = new Player(nick, user, hostname);
      self.game.addPlayer(player);
    }
  };

  /**
     * Remove player from game
     * @param client
     * @param message
     */
  self.quit = (client, message) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      self.game.removePlayer(self.game.getPlayer({ nick, hostname }));
    }
  };

  /**
     * Get players cards
     * @param client
     * @param message
     */
  self.cards = (client, message) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = self.game.getPlayer({ nick, hostname });
      self.game.showCards(player);
    }
  };

  /**
     * Play cards
     * @param client
     * @param message
     */
  self.play = (client, message, cmd) => {
    // check if everyone has played and end the round
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = self.game.getPlayer({ nick, hostname });
      if (!_.isUndefined(player)) {
        self.game.playCard(cmdArgs, player);
      }
    }
  };

  /**
     * List players in the game
     * @param client
     * @param message
     */
  self.list = (client, { args }) => {
    const channel = args[0];

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      self.game.listPlayers();
    }
  };

  /**
     * Select the winner
     * @param client
     * @param message
     * @param cmd
     */
  self.winner = (client, message, cmd) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = self.game.getPlayer({ nick, hostname });
      if (!_.isUndefined(player)) {
        self.game.selectWinner(cmdArgs[0], player);
      }
    }
  };

  /**
     * Show top players in current game
     * @param client
     * @param message
     */
  self.points = (client, { args }) => {
    const channel = args[0];

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      self.game.showPoints();
    }
  };

  /**
     * Show top players in current game
     * @param client
     * @param message
     */
  self.status = (client, { args }) => {
    const channel = args[0];

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      self.game.showStatus();
    }
  };

  self.pick = (client, message, cmd) => {
    // check if everyone has played and end the round
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start.');
    } else {
      const player = self.game.getPlayer({ nick, hostname });

      if (!_.isUndefined(player)) {
        if (self.game.state === Game.STATES.PLAYED && channel === self.game.channel) {
          self.game.selectWinner(cmdArgs[0], player);
        } else if (self.game.state === Game.STATES.PLAYABLE) {
          self.game.playCard(cmdArgs, player);
        } else {
          client.say(channel, '!pick command not available in current state.');
        }
      }
    }
  };

  self.discard = (client, message, cmd) => {
    const channel = message.args[0];
    const nick = message.nick;
    const hostname = message.host;
    const cmdArgs = cmd !== '' ? _.map(cmd.match(/(\w+)\s?/gi), str => str.trim()) : cmd;

    if (_.isUndefined(self.game) || self.game.state === Game.STATES.STOPPED) {
      client.say(channel, 'No game running. Start the game by typing !start');
    } else {
      const player = self.game.getPlayer({ nick, hostname });

      if (self.game.state === Game.STATES.PLAYABLE) {
        self.game.discard(cmdArgs, player);
      } else {
        client.say(channel, '!discard command not available in current state');
      }
    }
  };

  self.wiki = (client, { args, nick }) => {
    if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(nick, 'https://github.com/butlerx/butlerbot/wiki/Cards-Against-Humanity');
    } else {
      client.say(
        args[0],
        `${nick}: https://github.com/butlerx/butlerbot/wiki/Cards-Against-Humanity`,
      );
    }
  };
}

module.exports = CardsAgainstHumanity;
