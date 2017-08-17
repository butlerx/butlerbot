import c from 'irc-colors';
import _ from 'lodash';
import inflection from 'inflection';
import Deck from '../controllers/deck';

const STATES = {
  STOPPED : 'Stopped',
  STARTED : 'Started',
  PLAYABLE: 'Playable',
  TURN_END: 'Turn End',
  FINISHED: 'Game Finished',
  WAITING : 'Waiting',
};

class Game {
  constructor(channel, client, config, cmdArgs) {
    this.players = [];
    this.channel = channel;
    this.client = client;
    this.config = config;
    this.state = STATES.STOPPED;
    this.pointLimit = 0;
    this.deck = new Deck(true);
    this.discard = new Deck(false);
    this.firstCard = true;
    this.turn = 0;
    this.colors = ['YELLOW', 'GREEN', 'BLUE', 'RED'];

    this.deck.shuffle();

    if (
      !_.isUndefined(this.config.gameOptions.pointLimit) &&
      !isNaN(this.config.gameOptions.pointLimit)
    ) {
      console.log(`Setting pointLimit to ${this.config.gameOptions.pointLimit} from config`);
      this.pointLimit = this.config.gameOptions.pointLimit;
    }

    if (!_.isUndefined(cmdArgs[0]) && !isNaN(cmdArgs[0])) {
      console.log(`Setting pointLimit to ${cmdArgs[0]}from arguments`);
      this.pointLimit = cmdArgs[0];
    }
    this.setTopic(
      `${c.bold.lime('A game of')} ${c.bold.yellow('U')}${c.bold.green('N')}${c.bold.blue(
        'O',
      )}${c.bold.red('!')} ${c.bold.lime(
        'has been started. Type !j to get in on the fun! and !start when ready to play.',
      )}`,
    );

    if (_.isUndefined(this.config.gameOptions.minutesBeforeStart)) {
      this.minutesBeforeStart = 10;
    } else {
      this.minutesBeforeStart = this.config.gameOptions.minutesBeforeStart;
    }

    this.startTime = new Date();
    this.startTimeout = setTimeout(this.startTimeoutFunction, this.minutesBeforeStart * 60 * 1000);

    this.client.addListener('part', this.playerPartHandler);
    this.client.addListener('kick', this.playerKickHandler);
    this.client.addListener('quit', this.playerQuitHandler);
    this.client.addListener('nick', this.playerNickChangeHandler);
  }

  stop(nick, pointLimitReached) {
    this.state = STATES.FINISHED;
    console.log('In game.stop()');

    // Clear timeouts and intervals
    clearTimeout(this.startTimeout);
    clearInterval(this.turnTimeout);

    const player = this.getPlayer({ nick });

    if (!_.isNil(player)) this.say(`${player.nick} stopped the game.`);
    if (pointLimitReached !== true) this.say('Game has been stopped.');

    this.setTopic(c.bold.lime('No game running! !j To start a new one.'));

    // Remove listeners
    this.client.removeListener('part', this.playerPartHandler);
    this.client.removeListener('quit', this.playerQuitHandler);
    this.client.removeListener(`kick${this.channel}`, this.playerKickHandler);
    this.client.removeListener('nick', this.playerNickChangeHandler);

    // Delete Game properties
    delete this.players;
    delete this.channel;
    delete this.client;
    delete this.config;
    delete this.pointLimit;
    delete this.deck;
    delete this.discard;
    console.log('Game stopped');
  }

  startTimeoutFunction() {
    clearTimeout(this.startTimeout);
    this.say(`PING! ${_.map(this.players, ({ nick }) => nick).join(', ')}`);
    this.say(
      'The current game took too long to start and has been cancelled. If you are still active, please join again to start a new game.',
    );
    this.stop();
  }

  deal({ nick, hand }, number, showCard) {
    for (let i = 0; i < number; i += 1) {
      if (this.deck.numCards() === 0) {
        this.deck = this.discard;
        this.discard = new Deck(false);
        this.discard.addCard(this.deck.getCurrentCard());
        this.deck.shuffle();
      }

      const card = this.deck.deal();

      if (showCard === true) {
        this.pm(nick, `You drew ${c.bold.white(`[${hand.numCards()}] `)}${card.toString()}`);
      }

      hand.addCard(card);
    }
  }

  nextPlayer() {
    if (_.isUndefined(this.currentPlayer)) {
      return this.players[0];
    }

    if (this.players.length === 2) {
      const currentPlayerIndex = this.players.indexOf(this.currentPlayer);
      const nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;

      const nextPlayer =
        this.players[nextPlayerIndex].skipped === false
          ? this.players[nextPlayerIndex]
          : this.currentPlayer;
      return nextPlayer;
    }

    for (
      let i = (this.players.indexOf(this.currentPlayer) + 1) % this.players.length;
      i !== this.players.indexOf(this.currentPlayer);
      i = (i + 1) % this.players.length
    ) {
      if (this.players[i].skipped === false) {
        return this.players[i];
      }
    }
  }

  setPlayer() {
    this.currentPlayer = this.nextPlayer();
  }

  turnTimer() {
    // check the time
    const now = new Date();
    const idleTime = this.currentPlayer.idleTurns * this.config.gameOptions.idleRoundTimerDecrement;
    const turnMin = 60 * this.config.gameOptions.turnMinutes;
    const seconds = Math.max(60, turnMin - idleTime);
    const timeLimit = seconds * 1000;
    const second = sec => sec * 1000;
    const roundElapsed = now.getTime() - this.roundStarted.getTime();

    console.log('Round elapsed:', roundElapsed, now.getTime(), this.roundStarted.getTime());

    if (roundElapsed >= timeLimit) {
      this.say('Time is up!');
      this.idled();
    } else if (roundElapsed >= timeLimit - second(10) && roundElapsed < timeLimit) {
      // 10s ... 0s left
      this.say('10 seconds left!');
      this.pm(this.currentPlayer.nick, '10 seconds left');
    } else if (roundElapsed >= timeLimit - second(30) && roundElapsed < timeLimit - second(20)) {
      // 30s ... 20s left
      this.say('30 seconds left!');
      this.pm(this.currentPlayer.nick, '30 seconds left');
    } else if (roundElapsed >= timeLimit - second(60) && roundElapsed < timeLimit - second(50)) {
      // 60s ... 50s left
      this.say('Hurry up, 1 minute left!');
      this.pm(this.currentPlayer.nick, 'Hurry up, 1 minute left!');
    }
  }

  showCards(player) {
    let cardString = 'Your cards are:';
    if (!_.isUndefined(player)) {
      _.forEach(player.hand.getCards(), (card, index) => {
        cardString += c.bold(` [${index}] `) + card.toString();
        if (cardString.length >= 200) {
          this.pm(player.nick, cardString);
          cardString = '';
        }
      });
      this.pm(player.nick, cardString);
    }
  }

  showRoundInfo() {
    const turnMin = 60 * this.config.gameOptions.turnMinutes;
    const idleTime = this.currentPlayer.idleTurns * this.config.gameOptions.idleRoundTimerDecrement;
    const seconds = Math.max(60, turnMin - idleTime);

    this.say(
      `TURN ${this.turn}: ${this.currentPlayer.nick}'s turn. ${seconds} seconds on the clock`,
    );
  }

  nextTurn() {
    console.log('In game.nextTurn()');
    this.state = STATES.TURN_END;

    const winner = _.filter(this.players, ({ hand }) => hand.numCards() === 0)[0];

    if (!_.isUndefined(winner)) {
      console.log('Doing winner');
      this.say(`${winner.nick} has played all their cards and won the game! Congratulations!`);
      this.stop(null, true);
      return false;
    }

    if (this.players.length === 1) {
      this.say(`Only one player left. ${this.players[0].nick} wins the game!`);
      this.stop(null, null);
      return false;
    }

    this.state = STATES.PLAYABLE;
    this.setPlayer();

    if (this.turn === 0) {
      this.discard.addCard(this.deck.deal());
    }

    this.turn += 1;
    // Unset flags
    _.forEach(this.players, player => {
      player.skipped = false;
      player.hasPlayed = false;
      player.hasDrawn = false;
      player.uno = false;
    });

    this.showRoundInfo();

    if (this.firstCard === true) {
      this.say(`The first card is: ${this.discard.getCurrentCard().toString()}`);
      this.discard.getCurrentCard().onPlay(this);
    }

    this.showCards(this.currentPlayer);
    this.pm(
      this.currentPlayer.nick,
      `The current card is: ${this.discard.getCurrentCard().toString()}`,
    );

    this.roundStarted = new Date();
    this.turnTimeout = setInterval(this.turnTimer, 10 * 1000);
  }

  idled() {
    this.currentPlayer.idleTurns += 1;
    console.log(`${this.currentPlayer.nick} has idled ${this.currentPlayer.idleTurns}`);

    if (this.currentPlayer.idleTurns < this.config.gameOptions.maxIdleTurns) {
      this.say(`${this.currentPlayer.nick} has idled. Drawing a card and ending their turn.`);
      this.draw(this.currentPlayer.nick, true);
    } else {
      this.say(
        `${this.currentPlayer.nick} has idled ${this.config.gameOptions
          .maxIdleTurns} ${inflection.inflect(
          'time',
          this.config.gameOptions.maxIdleTurns,
        )}. Removing them from the game.`,
      );
      this.removePlayer(this.currentPlayer.nick);
    }

    if (!_.isUndefined(this.players)) {
      this.endTurn();
    }
  }

  endTurn(nick, idle) {
    if (!_.isUndefined(nick) && this.currentPlayer.nick !== nick) {
      this.pm(nick, 'It is not your turn');
      return false;
    }

    if (this.currentPlayer.hasPlayed === false && this.currentPlayer.hasDrawn === false) {
      this.pm(
        this.currentPlayer.nick,
        'You must at least draw a card before you can end your turn',
      );
      return false;
    }

    clearInterval(this.turnTimeout);

    if (this.currentPlayer.hasPlayed === false && idle !== true) {
      this.say(`${this.currentPlayer.nick} has ended their turn without playing.`);
    }

    if (this.currentPlayer.uno === false && this.currentPlayer.hand.numCards() === 1) {
      this.currentPlayer.challengable = true;
    }

    if (idle !== true) {
      this.currentPlayer.idleTurns = 0;
    }
    this.nextTurn();
  }

  start(nick) {
    console.log('In game.start()');
    clearTimeout(this.startTimeout);

    if (_.isUndefined(this.getPlayer({ nick }))) {
      this.say(`${nick}: Only players may start the game. !j to get in on the fun.`);
      return false;
    }

    if (this.players.length < 2) {
      this.say(`${nick}: There must be at least 2 players to start a game.`);
      return false;
    }

    this.state = STATES.STARTED;

    _.forEach(this.players, player => {
      this.deal(player, 7);
    });
    this.setTopic(
      `${c.bold.lime('A game of ')}${c.bold.yellow('U')}${c.bold.green('N')}${c.bold.blue(
        'O',
      )}${c.bold.red('!')}${c.bold.lime(' is running.')}`,
    );
    this.nextTurn();
  }

  playCard({ nick, hand }, card, color) {
    let playString = '';

    this.discard.addCard(card);

    playString += `${nick} has played ${card.toString()}! `;

    if (card.color === 'WILD') {
      playString += `${nick} has changed the color to ${color}. `;
      card.color = color.toUpperCase();
    }

    playString += `${nick} has ${hand.numCards()} ${inflection.inflect(
      'card',
      hand.numCards(),
    )} left`;

    this.say(playString);

    card.onPlay(this);
  }

  play(nick, cardRaw, color) {
    const player = this.getPlayer({ nick });
    const card = parseInt(cardRaw, 10);

    if (_.isUndefined(player)) {
      console.log('Player is undefined');
      return false;
    }

    if (player !== this.currentPlayer) {
      this.pm(player.nick, 'It is not your turn.');
      return false;
    }

    if (isNaN(cardRaw)) {
      this.pm(player.nick, 'Please enter a valid numeric index');
      return false;
    }

    if (card < 0 || card >= player.hand.numCards()) {
      this.pm(player.nick, 'Please enter a valid index');
      return false;
    }

    if (player.hand.checkPlayable(card, this.discard.getCurrentCard()) === false) {
      this.pm(player.nick, 'That card is not playable. Please select another card.');
      return false;
    }

    if (player.hand.getCard(card).color === 'WILD' && _.isUndefined(color)) {
      this.pm(player.nick, 'Please provide a color for this card!');
      return false;
    }

    if (
      player.hand.getCard(card).color === 'WILD' &&
      !_.includes(this.colors, color.toUpperCase())
    ) {
      this.pm(
        player.nick,
        'Please provide a valid color for this card. [Red, Blue, Green, Yellow]',
      );
      return false;
    }

    if (player.hasDrawn && card !== player.hand.numCards() - 1) {
      this.pm(player.nick, 'You must use the card you drew');
      return false;
    }

    const pickedCard = player.hand.pickCard(card);
    this.discard.addCard(pickedCard);
    let playString = `${player.nick} has played ${pickedCard.toString()}! ${player.nick} has ${player.hand.numCards()} left.`;
    pickedCard.onPlay(this);

    if (pickedCard.color === 'WILD') {
      playString += `${player.nick} has changed the color to `;
      switch (color.toUpperCase()) {
        case 'YELLOW':
          playString += `${c.bold.yellow(color)}. `;
          break;
        case 'GREEN':
          playString += `${c.bold.green(color)}. `;
          break;
        case 'BLUE':
          playString += `${c.bold.blue(color)}. `;
          break;
        case 'RED':
          playString += `${c.bold.red(color)}. `;
          break;
        default:
          break;
      }
      pickedCard.color = color.toUpperCase();
    }

    this.say(playString);

    player.hasPlayed = true;

    for (let i = 0; i < this.players.length; i += 1) {
      this.players[i].challengeable = false;
    }
    this.endTurn();
  }

  draw(nick, idle) {
    if (this.currentPlayer.nick !== nick) {
      this.pm(nick, 'It is not your turn.');
      return false;
    }

    if (this.currentPlayer.hasDrawn === true) {
      this.pm(nick, 'You can only draw once per turn.');
      return false;
    }

    this.deal(this.currentPlayer, 1, true);
    this.currentPlayer.hasDrawn = true;

    _.forEach(this.players, player => {
      player.challengeable = false;
    });

    this.say(
      `${this.currentPlayer
        .nick} has drawn a card and has ${this.currentPlayer.hand.numCards()} left.`,
    );

    const drawnCard = this.currentPlayer.hand.getCard(this.currentPlayer.hand.numCards() - 1);

    if (idle) {
      this.endTurn(nick, idle);
    } else if (drawnCard.isPlayable(this.discard.getCurrentCard()) === false) {
      this.pm(this.currentPlayer.nick, 'You have no playable cards. Ending your turn.');
      this.endTurn();
    }
  }

  uno(nick, card, color) {
    if (this.currentPlayer.nick !== nick) {
      this.pm(nick, 'It is not your turn');
      return false;
    }

    if (this.currentPlayer.hand.numCards() === 2) {
      this.currentPlayer.uno = true;
      this.say(`${this.currentPlayer.nick} has declared UNO!`);
      if (!_.isUndefined(card)) this.play(nick, card, color);
    }
  }

  challenge(nick) {
    const player = this.getPlayer({ nick });

    if (_.isUndefined(player) === true) return false;
    if (player.hasChallenged === true) return false;
    if (this.turn === 1) return false;

    let challengeablePlayer = this.getPlayer({ challengeable: true });

    if (!_.isUndefined(challengeablePlayer)) {
      this.say(
        `${player.nick} has successfully challenged ${challengeablePlayer.nick}. ${challengeablePlayer.nick} has drawn 2 cards.`,
      );
      this.deal(challengeablePlayer, 2, true);
      challengeablePlayer = false;
    } else {
      this.say(`${player.nick} has unsuccessfully challeneged and has picked up 2 cards.`);
      this.deal(player, 2, true);
    }

    player.hasChallenged = true;
  }

  showStatus() {
    this.say(
      this.state === STATES.PLAYABLE
        ? `It is currently ${this.currentPlayer.nick} go!`
        : `${this.players.length} people are playing. ${_.map(this.players, 'nick').join(', ')}`,
    );
  }

  addPlayer(player) {
    const alreadyPlayer = this.getPlayer({
      nick    : player.nick,
      user    : player.user,
      hostname: player.hostname,
    });

    if (!_.isUndefined(alreadyPlayer)) return false;
    this.players.push(player);
    this.state = STATES.WAITING;
    this.say(`${player.nick} has joined the game!`);
    if (this.state === STATES.WAITING && this.players.length === 10) this.start();
  }

  removePlayer(nick) {
    const player = this.getPlayer({ nick });

    if (_.isUndefined(player)) return false;

    // Add cards back into the deck
    _.forEach(player.hand.getCards(), card => {
      this.deck.addCard(card);
    });

    this.deck.shuffle();
    console.log(`${player.nick} removed.`);
    this.say(`${player.nick} has left the game.`);
    this.players.splice(this.players.indexOf(player), 1);

    // If the player is the current player, move to the next turn
    if (!_.isUndefined(this.currentPlayer) && this.currentPlayer === player) {
      clearInterval(this.turnTimeout);
      this.nextTurn();
    } else if (
      this.players.length < 2 &&
      this.state !== STATES.FINISHED &&
      this.state !== STATES.STOPPED &&
      this.state !== STATES.WAITING
    ) {
      this.stop();
    } else if (this.players.length === 0) {
      this.stop();
    }
  }

  setTopic(topic) {
    // ignore if not configured to set topic
    if (
      _.isUndefined(this.config.gameOptions.setTopic) ||
      this.config.gameOptions.setTopic === false
    ) {
      return false;
    }

    // construct new topic
    const newTopic = !_.isUndefined(this.config.gameOptions.topicBase)
      ? `${topic} ${this.config.gameOptions.topicBase}`
      : topic;

    // set it
    this.client.send('TOPIC', this.channel, newTopic);
  }

  getPlayer(search) {
    _.find(this.players, search);
  }

  findAndRemoveIfPlaying(nick) {
    const player = this.getPlayer({ nick });

    if (!_.isUndefined(player)) {
      this.removePlayer(player.nick);
    }
  }

  playerPartHandler(chan, nick) {
    console.log(`${nick} left. Removing from game.`);
    this.findAndRemoveIfPlaying(nick);
  }

  playerKickHandler(chan, nick, by) {
    console.log(`${nick} was kicked by ${by}. Removing from game.`);
    this.findAndRemoveIfPlaying(nick);
  }

  playerQuitHandler(nick) {
    console.log(`${nick} has quit. Removing from game.`);
    this.findAndRemoveIfPlaying(nick);
  }

  playerNickChangeHandler(oldnick, newnick) {
    console.log(`${oldnick} has changed to ${newnick}. Updating player.`);

    const player = this.getPlayer({ nick: oldnick });

    if (!_.isUndefined(player)) {
      player.nick = newnick;
    }
  }

  say(string) {
    this.client.say(this.channel, string);
  }

  pm(nick, string) {
    this.client.say(nick, string);
  }
}

Game.STATES = STATES;

export default Game;
