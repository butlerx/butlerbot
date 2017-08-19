import c from 'irc-colors';
import _ from 'lodash';
import util from 'util';
import inflection from 'inflection';
import Cards from '../controllers/cards';

const seconds = sec => sec * 1000;
/**
 * Available states for game
 * @type {{STOPPED: string, STARTED: string, PLAYABLE: string, PLAYED: string, ROUND_END: string, WAITING: string}}
 */
const STATES = {
  STOPPED  : 'Stopped',
  STARTED  : 'Started',
  PLAYABLE : 'Playable',
  PLAYED   : 'Played',
  ROUND_END: 'RoundEnd',
  WAITING  : 'Waiting',
  PAUSED   : 'Paused',
};

/** Class for Game of Cards Against Humanity */
class Game {
  /**
   * A single game object that handles all operations in a game
   * @param {String} channel The channel the game is running on
   * @param {Object} client The IRC client object
   * @param {Object} config Configuration variables
   * @param {Object} cmdArgs !start command arguments
   * @param {Object} dbModels sequelize database Models
   */
  constructor(channel, client, config, cmdArgs, dbModels) {
    this.waitCount = 0; // number of times waited until enough players
    this.round = 0; // round number
    this.players = []; // list of players
    this.playersToAdd = []; // list of players to add after deferring because the game doesn't exist in the database yet
    this.channel = channel; // the channel this game is running on
    this.client = client; // reference to the irc client
    this.config = config; // configuration data
    this.state = STATES.STARTED; // game state storage
    this.pauseState = []; // pause state storage
    this.notifyUsersPending = false;
    this.pointLimit = 0; // point limit for the game, defaults to 0 (== no limit)
    this.dbModels = dbModels;
    // set topic
    this.setTopic(c.bold.lime('A game is running. Type !join to get in on it!'));

    // announce the game on the channel
    this.say(
      `A new game of ${c.rainbow('Cards Against Humanity')}. The game starts in ${config.gameOptions
        .secondsBeforeStart} ${inflection.inflect(
        'seconds',
        config.gameOptions.secondsBeforeStart,
      )}. Type !join to join the game any time.`,
    );

    // notify users
    if (!_.isUndefined(config.gameOptions.notifyUsers) && config.gameOptions.notifyUsers) {
      this.notifyUsers();
    }

    // wait for players to join
    this.startTime = new Date();
    this.startTimeout = setTimeout(this.nextRound, seconds(config.gameOptions.secondsBeforeStart));

    // client listeners
    client.addListener('part', this.playerPartHandler);
    client.addListener('quit', this.playerQuitHandler);
    client.addListener(`kick${channel}`, this.playerKickHandler);
    client.addListener('nick', this.playerNickChangeHandler);
    client.addListener(`names${channel}`, this.notifyUsersHandler);
    // Add game to database if database is enabled
    this.createGameDatabaseRecord();
    console.log('Loaded', config.cards.length, 'cards:');
    const questions = _.filter(config.cards, ({ type }) => type.toLowerCase() === 'question');
    console.log(questions.length, 'questions');

    const answers = _.filter(config.cards, ({ type }) => type.toLowerCase() === 'answer');
    console.log(answers.length, 'answers');

    // init decks
    this.decks = {
      question: new Cards(questions),
      answer  : new Cards(answers),
    };
    // init discard piles
    this.discards = {
      question: new Cards(),
      answer  : new Cards(),
    };
    // init table slots
    this.table = {
      question: null,
      answer  : [],
    };
    // shuffle decks
    this.decks.question.shuffle();
    this.decks.answer.shuffle();

    // parse point limit from configuration file
    if (!_.isUndefined(config.gameOptions.pointLimit) && !isNaN(config.gameOptions.pointLimit)) {
      console.log(`Set game point limit to ${config.gameOptions.pointLimit} from config`);
      this.pointLimit = parseInt(config.gameOptions.pointLimit, 10);
    }
    // parse point limit from command arguments
    if (!_.isUndefined(cmdArgs[0]) && !isNaN(cmdArgs[0])) {
      console.log(`Set game point limit to ${cmdArgs[0]} from arguments`);
      this.pointLimit = parseInt(cmdArgs[0], 10);
    }
  }

  /**
   * Add Game to Database
   */
  createGameDatabaseRecord() {
    if (this.config.gameOptions.database === true) {
      // Adding game to database
      this.dbModels.Game.create({ num_rounds: this.round }).then(game => {
        this.dbGame = game;
        _.forEach(this.playersToAdd, player => {
          this.addPlayer(player);
        });
      });
    }
  }

  updateGameDatabaseRecordGameOver(limitReached, { gameOptions }) {
    if (gameOptions.database === true) {
      if (limitReached) {
        // Get winning player
        const winner = this.getPlayer({ points: this.pointLimit });

        // Get player from database and update the game
        this.dbModels.Player.findOne({ where: { nick: winner.nick } }).then(({ id }) => {
          this.dbGame.update({ ended_at: new Date(), num_rounds: this.round, winner_id: id });
          this.updateGameDatabaseRecordGameOver(true);
        });
      } else {
        this.dbGame.update({ ended_at: new Date(), num_rounds: this.round, winner_id: null });
      }
    }
  }

  updatePointsDatabaseTable() {
    if (this.config.gameOptions.database === true) {
      _.forEach(this.players, ({ nick, isActive, points }) => {
        this.dbModels.Player.findOne({ where: { nick } }).then(({ id }) => {
          this.updateOrCreateInstance(
            this.dbModels.Points,
            { where: { player_id: id, game_id: this.dbGame.id } },
            { player_id: id, game_id: this.dbGame.id, is_active: isActive, points },
            { points },
          );
        });
      });
    }
  }

  updateOrCreateInstance(model, query, createFields, updateFields) {
    model.findOne(query).then(instance => {
      if (instance === null && createFields !== null) {
        model.create(createFields);
      } else if (instance !== null && updateFields !== null) {
        instance.update(updateFields);
      }
    });
    return this;
  }

  recordRound(cardValue) {
    if (this.config.gameOptions.database === true) {
      this.dbModels.Card.findOne({ where: { text: cardValue } }).then(instance => {
        instance.update({ times_played: instance.times_played + 1 }).then(({ id }) => {
          this.createRound(id);
        });
      });
    }
  }

  createCardCombo({ nick }, cards) {
    if (this.config.gameOptions.database === true) {
      this.dbModels.Player.findOne({ where: { nick } }).then(({ id }) => {
        this.updateCardComboTable(id, cards);
      });
    }
  }

  updateCardComboTable(id, playerCards) {
    if (this.config.gameOptions.database === true) {
      const round = this.dbCurrentRound;
      let cardString = [];

      this.dbModels.Card
        .findAll({
          where: {
            text: {
              in: _.map(playerCards, ({ value }) => value),
            },
          },
        })
        .then(cards => {
          if (playerCards.length === 1) {
            cardString = cards[0].id;
          } else {
            _.forEach(playerCards, ({ value }) => {
              _.forEach(cards, card => {
                if (value === card.text) {
                  cardString.push(card.id);
                }
              });
            });

            cardString = cardString.join(',');
          }

          this.updateOrCreateInstance(
            this.dbModels.CardCombo,
            { where: { game_id: this.dbGame.id, player_id: id, questionID: round.questionID } },
            {
              game_id   : this.dbGame.id,
              player_id : id,
              questionID: round.questionID,
              answer_ids: cardString,
              winner    : false,
            },
            null,
          );

          // Finally update each of the cards times played count
          _.forEach(cards, card => {
            card.update({ times_played: card.times_played + 1 });
          });
        });
    }
  }

  createRound(questionID) {
    if (this.config.gameOptions.database === true) {
      this.dbModels.Round
        .create({
          game_id           : this.dbGame.id,
          round_number      : this.round,
          num_active_players: _.filter(this.players, ({ isActive }) => isActive).length,
          total_players     : this.players.length,
          questionID,
        })
        .then(round => {
          this.dbCurrentRound = round;
        });
    }
  }

  setWinnerDatabase(round, { nick }) {
    if (this.config.gameOptions.database === true) {
      this.dbModels.Player.findOne({ where: { nick } }).then(({ id }) => {
        round.update({ winner_id: id });
      });
    }
  }

  createPlayerDatabaseRecord({ nick }) {
    if (this.config.gameOptions.database === true) {
      this.updateOrCreateInstance(
        this.dbModels.Player,
        { where: { nick } },
        { nick, last_game_id: this.dbGame.id },
        { last_game_id: this.dbGame.id },
      );
    }
  }

  updatePlayerDatabaseRecord({ nick }) {
    if (this.config.gameOptions.database === true) {
      this.updateOrCreateInstance(
        this.dbModels.Player,
        { where: { nick } },
        { nick, last_game_id: this.dbGame.id },
        { last_game_id: this.dbGame.id },
      );
    }
  }

  /**
   * Stop game
   */
  stop(player, pointLimitReached) {
    this.state = STATES.STOPPED;

    if (!_.isUndefined(player) && !_.isNil(player)) this.say(`${player.nick} stopped the game.`);
    // show points if played more than one round
    if (this.round > 1) this.showPoints();

    if (pointLimitReached !== true) {
      this.say('Game has been stopped.');
      this.updateGameDatabaseRecordGameOver(false, this.config);
    } else {
      this.updateGameDatabaseRecordGameOver(true, this.config);
    }

    // Update points table
    this.updatePointsDatabaseTable();

    // clear all timers
    clearTimeout(this.startTimeout);
    clearTimeout(this.stopTimeout);
    clearTimeout(this.turnTimer);
    clearTimeout(this.winnerTimer);

    // Remove listeners
    this.client.removeListener('part', this.playerPartHandler);
    this.client.removeListener('quit', this.playerQuitHandler);
    this.client.removeListener(`kick${this.channel}`, this.playerKickHandler);
    this.client.removeListener('nick', this.playerNickChangeHandler);
    this.client.removeListener(`names${this.channel}`, this.notifyUsersHandler);

    // Destroy game properties
    delete this.players;
    delete this.config;
    delete this.client;
    delete this.channel;
    delete this.round;
    delete this.decks;
    delete this.discards;
    delete this.table;

    // set topic
    this.setTopic(c.bold.yellow('No game is running. Type !start to begin one!'));
  }

  /**
     * Pause game
     */
  pause() {
    // check if game is already paused
    if (this.state === STATES.PAUSED) {
      this.say('Game is already paused. Type !resume to begin playing again.');
      return false;
    }

    // only allow pause if game is in PLAYABLE or PLAYED state
    if (this.state !== STATES.PLAYABLE && this.state !== STATES.PLAYED) {
      this.say('The game cannot be paused right now.');
      return false;
    }

    // store state and pause game
    const now = new Date();
    this.pauseState.state = this.state;
    this.pauseState.elapsed = now.getTime() - this.roundStarted.getTime();
    this.state = STATES.PAUSED;

    this.say('Game is now paused. Type !resume to begin playing again.');

    // clear turn timers
    clearTimeout(this.turnTimer);
    clearTimeout(this.winnerTimer);
  }

  /**
     * Resume game
     */
  resume() {
    // make sure game is paused
    if (this.state !== STATES.PAUSED) {
      this.say('The game is not paused.');
      return false;
    }

    // resume game
    const now = new Date();
    const newTime = new Date();
    newTime.setTime(now.getTime() - this.pauseState.elapsed);
    this.roundStarted = newTime;
    this.state = this.pauseState.state;

    this.say('Game has been resumed.');
    // resume timers
    if (this.state === STATES.PLAYED) {
      // check if czar quit during pause
      if (_.includes(this.players, this.czar)) {
        // no czar
        this.say('The czar quit the game during pause. I will pick the winner on this round.');
        // select winner
        this.selectWinner(Math.round(Math.random() * (this.table.answer.length - 1)));
      } else {
        this.winnerTimer = setInterval(this.winnerTimerCheck, 10 * 1000);
      }
    } else if (this.state === STATES.PLAYABLE) {
      this.turnTimer = setInterval(this.turnTimerCheck, 10 * 1000);
    }
  }

  /**
     * Start next round
     */
  nextRound() {
    clearTimeout(this.stopTimeout);
    // check if any player reached the point limit
    if (this.pointLimit > 0) {
      const winner = _.find(this.players, { points: this.pointLimit });
      if (winner) {
        this.say(
          `${winner.nick} has the limit of ${this.pointLimit} awesome ${inflection.inflect(
            'points',
            this.pointLimit,
          )} and is the winner of the game! Congratulations!`,
        );
        this.stop(null, true);
        return false;
      }
    }

    // check that there's enough players in the game
    if (_.filter(this.players, { isActive: true }).length < 3) {
      this.say(
        `Not enough players to start a round (need at least 3). Waiting for others to join. Stopping in ${this
          .config.gameOptions.roundMinutes} ${inflection.inflect(
          'minutes',
          this.config.gameOptions.roundMinutes,
        )} if not enough players.`,
      );
      this.state = STATES.WAITING;
      // stop game if not enough pleyers in however many minutes in the config
      this.stopTimeout = setTimeout(this.stop, 60 * 1000 * this.config.gameOptions.roundMinutes);
      return false;
    }

    this.updatePointsDatabaseTable();

    this.round += 1;
    this.dbGame.update({ num_rounds: this.round });
    console.log('Starting round ', this.round);

    this.setCzar();
    this.deal();
    this.say(`Round ${this.round}! ${this.czar.nick} is the card czar.`);
    this.playQuestion();

    // show cards for all players (except czar)
    _.forEach(this.players, player => {
      if (player.isCzar !== true && player.isActive === true) {
        this.showCards(player);
        this.pm(player.nick, 'Play cards with !cah');
      }
    });

    this.state = STATES.PLAYABLE;
  }

  /**
     * Set a new czar
     * @returns Player The player object who is the new czar
     */
  setCzar() {
    if (this.czar) {
      console.log(`Old czar: ${this.czar.nick}`);
      let nextCzar;

      _.forEach(this.players, ({ nick, isActive }) => {
        console.log(`${nick}: ${isActive}`);
      });

      for (
        let i = (this.players.indexOf(this.czar) + 1) % this.players.length;
        i !== this.players.indexOf(this.czar);
        i = (i + 1) % this.players.length
      ) {
        console.log(`${i}: ${this.players[i].nick}: ${this.players[i].isActive}`);
        if (this.players[i].isActive === true) {
          nextCzar = i;
          break;
        }
      }

      this.czar = this.players[nextCzar];
    } else {
      this.czar = _.filter(this.players, { isActive: true })[0];
    }

    console.log('New czar:', this.czar.nick);
    this.czar.isCzar = true;
    return this.czar;
  }

  /**
     * Deal cards to fill players' hands
     */
  deal(targetPlayer, num) {
    if (_.isUndefined(targetPlayer)) {
      _.forEach(
        this.players,
        _.bind(player => {
          if (player.isActive) {
            console.log(
              `${player.nick}(${player.hostname}) has ${player.cards.numCards()} cards. Dealing ${10 -
                player.cards.numCards()} cards`,
            );
            for (let i = player.cards.numCards(); i < 10; i += 1) {
              this.checkDecks();
              const card = this.decks.answer.pickCards();
              player.cards.addCard(card);
              card.owner = player;
            }
          }
        }, this),
      );
    } else if (typeof num !== 'undefined') {
      for (let i = targetPlayer.cards.numCards(); i < num; i += 1) {
        this.checkDecks();
        const card = this.decks.answer.pickCards();
        targetPlayer.cards.addCard(card);
        card.owner = targetPlayer;
      }
    }
  }

  /**
     * Clean up table after round is complete
     */
  clean() {
    // move cards from table to discard
    this.discards.question.addCard(this.table.question);
    this.table.question = null;
    // var count = this.table.answer.length;
    _.forEach(
      this.table.answer,
      _.bind(function cleanCards(cards) {
        _.forEach(
          cards.getCards(),
          _.bind(card => {
            card.owner = null;
            this.discards.answer.addCard(card);
            cards.removeCard(card);
          }, this),
        );
      }, this),
    );
    this.table.answer = [];

    // reset players
    const removedNicks = [];
    _.forEach(this.players, player => {
      player.hasPlayed = false;
      player.hasDiscarded = false;
      player.isCzar = false;
      // check if idled and remove
      if (player.inactiveRounds >= 1) {
        player.inactiveRounds = 0;
        this.removePlayer(player, { silent: true });
        removedNicks.push(player.nick);
      }
    });

    if (removedNicks.length > 0) {
      this.say(
        `Removed inactive ${inflection.inflect(
          'players',
          removedNicks.length,
        )}: ${removedNicks.join(', ')}`,
      );
    }
    // reset state
    this.state = STATES.STARTED;
  }

  /**
     * Play new question card on the table
     */
  playQuestion() {
    this.checkDecks();
    const card = this.decks.question.pickCards();
    // replace all instance of %s with underscores for prettier output
    let value = card.value.replace(/%s/g, '___');
    // check if special pick & draw rules
    if (card.pick > 1) value += c.bold(` [PICK ${card.pick}]`);
    if (card.draw > 0) value += c.bold(` [DRAW ${card.draw}]`);
    this.say(c.bold('CARD: ') + value);
    this.table.question = card;

    // Record card and round in the database
    this.recordRound(card.value);

    // PM Card to players
    _.forEach(_.filter(this.players, { isCzar: false, isActive: true }), ({ nick }) => {
      this.pm(nick, c.bold('CARD: ') + value);
    });

    // draw cards
    if (this.table.question.draw > 0) {
      _.forEach(_.filter(this.players, { isCzar: false, isActive: true }), player => {
        for (let i = 0; i < this.table.question.draw; i += 1) {
          this.checkDecks();
          const pickedCard = this.decks.answer.pickCards();
          player.cards.addCard(pickedCard);
          pickedCard.owner = player;
        }
      });
    }
    // start turn timer, check every 10 secs
    clearInterval(this.turnTimer);
    this.roundStarted = new Date();
    this.turnTimer = setInterval(this.turnTimerCheck, 10 * 1000);
  }

  /**
     * Play a answer card from players hand
     * @param cards card indexes in players hand
     * @param player Player who played the cards
     */
  playCard(rawCards, player) {
    // don't allow if game is paused
    if (this.state === STATES.PAUSED) {
      this.say('Game is currently paused.');
      return false;
    }

    const cards = _.uniq(rawCards);
    console.log(`${player.nick} played cards`, cards.join(', '));
    // make sure different cards are played
    if (this.state !== STATES.PLAYABLE || player.cards.numCards() === 0) {
      this.say(`${player.nick}: Can't play at the moment.`);
    } else if (!_.isUndefined(player)) {
      if (player.isCzar === true) {
        this.say(
          `${player.nick}: You are the card czar. The czar does not play. The czar makes other people do their dirty work.`,
        );
      } else if (player.hasPlayed === true) {
        this.say(`${player.nick}: You have already played on this round.`);
      } else if (cards.length !== this.table.question.pick) {
        // invalid card count
        this.say(
          `${player.nick}: You must pick ${inflection.inflect(
            'cards',
            this.table.question.pick,
            '1 card',
            `${this.table.question.pick} different cards`,
          )}.`,
        );
      } else {
        // get played cards
        let playerCards;
        try {
          playerCards = player.cards.pickCards(cards);
        } catch (error) {
          this.pm(player.nick, 'Invalid card index');
          return false;
        }
        this.table.answer.push(playerCards);
        player.hasPlayed = true;
        player.inactiveRounds = 0;
        this.pm(
          player.nick,
          `You played: ${this.getFullEntry(this.table.question, playerCards.getCards())}`,
        );

        // Update card combo table
        this.createCardCombo(player, playerCards.getCards());

        // show entries if all players have played
        if (this.checkAllPlayed()) {
          this.showEntries();
        }
      }
    } else {
      console.warn('Invalid player tried to play a card');
    }
  }

  /**
     * Allow a player to discard a number of cards once per turn
     * @param cards Array of card indexes to discard
     * @param player The player who discarded
     */
  discard(rawCards, player) {
    if (this.state === STATES.PAUSED) {
      this.say('Game is currently paused');
      return false;
    }

    let cards = _.uniq(rawCards);
    console.log(`${player.nick} discarded ${cards.join(', ')}`);

    if (this.state !== STATES.PLAYABLE || player.cards.numCards() === 0) {
      this.say(`${player.nick}: Can't discard at the moment.`);
    } else if (!_.isUndefined(player)) {
      if (player.isCzar === true) {
        this.say(
          `${player.nick}: You are the card czar. You cannot discard cards until you are a regular player.`,
        );
      } else if (player.hasDiscarded === true) {
        this.say(`${player.nick}: You may only discard once per turn.`);
      } else if (player.points < 1) {
        this.say(`${player.nick}: You must have at least one awesome point to discard.`);
      } else {
        let playerCards;

        if (cards.length === 0) {
          cards = [];
          for (let i = 0; i < player.cards.numCards(); i += 1) {
            cards[i] = i;
          }
        }

        try {
          playerCards = player.cards.pickCards(cards);
        } catch (error) {
          this.pm(player.nick, 'Invalid card index.');
          return false;
        }

        this.deal(player, player.cards.numCards() + playerCards.numCards());

        // Add the cards to the discard pile, and reduce points, and mark the player as having discarded
        _.forEach(playerCards.getCards(), card => {
          card.owner = null;
          this.discards.answer.addCard(card);
          playerCards.removeCard(card);
        });

        player.hasDiscarded = true;
        player.points -= 1;

        this.pm(
          player.nick,
          `You have discarded, and have ${player.points} ${inflection.inflect(
            'points',
            player.points,
          )} remaining`,
        );
        this.showCards(player);
      }
    } else {
      console.warn('Invalid player tried to discard cards');
    }
  }

  /**
     * Check the time that has elapsed since the beinning of the turn.
     * End the turn is time limit is up
     */
  turnTimerCheck() {
    // check the time
    const now = new Date();
    const timeLimit = 60 * 1000 * this.config.gameOptions.roundMinutes;
    const roundElapsed = now.getTime() - this.roundStarted.getTime();
    console.log('Round elapsed:', roundElapsed, now.getTime(), this.roundStarted.getTime());
    if (roundElapsed >= timeLimit) {
      console.log('The round timed out');
      this.say('Time is up!');
      this.markInactivePlayers();
      // show end of turn
      this.showEntries();
    } else if (roundElapsed >= timeLimit - seconds(10) && roundElapsed < timeLimit) {
      // 10s ... 0s left
      this.say('10 seconds left!');
    } else if (roundElapsed >= timeLimit - seconds(30) && roundElapsed < timeLimit - seconds(20)) {
      // 30s ... 20s left
      this.say('30 seconds left!');
    } else if (roundElapsed >= timeLimit - seconds(60) && roundElapsed < timeLimit - seconds(50)) {
      // 60s ... 50s left
      this.say('Hurry up, 1 minute left!');
      this.showStatus();
    }
  }

  /**
     * Show the entries
     */
  showEntries() {
    // clear round timer
    clearInterval(this.turnTimer);

    this.state = STATES.PLAYED;
    // Check if 2 or more entries...
    if (this.table.answer.length === 0) {
      this.say('No one played on this round.');
      // skip directly to next round
      this.clean();
      this.nextRound();
    } else if (this.table.answer.length === 1) {
      this.say('Only one player played and is the winner by default.');
      this.selectWinner(0);
    } else {
      this.say('Everyone has played. Here are the entries:');
      // shuffle the entries
      this.table.answer = _.shuffle(this.table.answer);
      _.forEach(
        this.table.answer,
        _.bind((cards, i) => {
          this.say(`${i}: ${this.getFullEntry(this.table.question, cards.getCards())}`);
        }, this),
      );
      // check that czar still exists
      const currentCzar = _.find(this.players, { isCzar: true, isActive: true });
      if (_.isUndefined(currentCzar)) {
        // no czar, random winner (TODO: Voting?)
        this.say('The czar has fled the scene. So I will pick the winner on this round.');
        this.selectWinner(Math.round(Math.random() * (this.table.answer.length - 1)));
      } else {
        this.say(`${this.czar.nick}: Select the winner (!cah <entry number>)`);
        // start turn timer, check every 10 secs
        clearInterval(this.winnerTimer);
        this.roundStarted = new Date();
        this.winnerTimer = setInterval(this.winnerTimerCheck, 10 * 1000);
      }
    }
  }

  /**
     * Check the time that has elapsed since the beinning of the winner select.
     * End the turn is time limit is up
     */
  winnerTimerCheck() {
    // check the time
    const now = new Date();
    const timeLimit = 60 * 1000 * this.config.gameOptions.roundMinutes;
    const roundElapsed = now.getTime() - this.roundStarted.getTime();
    console.log(
      'Winner selection elapsed:',
      roundElapsed,
      now.getTime(),
      this.roundStarted.getTime(),
    );
    if (roundElapsed >= timeLimit) {
      console.log('the czar is inactive, selecting winner');
      this.say('Time is up. I will pick the winner on this round.');
      // Check czar & remove player after 3 timeouts
      this.czar.inactiveRounds += 1;
      // select winner
      this.selectWinner(Math.round(Math.random() * (this.table.answer.length - 1)));
    } else if (roundElapsed >= timeLimit - seconds(10) && roundElapsed < timeLimit) {
      // 10s ... 0s left
      this.say(`${this.czar.nick}: 10 seconds left!`);
    } else if (roundElapsed >= timeLimit - seconds(30) && roundElapsed < timeLimit - seconds(20)) {
      // 30s ... 20s left
      this.say(`${this.czar.nick}: 30 seconds left!`);
    } else if (roundElapsed >= timeLimit - seconds(60) && roundElapsed < timeLimit - seconds(50)) {
      // 60s ... 50s left
      this.say(`${this.czar.nick}: Hurry up, 1 minute left!`);
    }
  }

  /**
     * Pick an entry that wins the round
     * @param index Index of the winning card in table list
     * @param player Player who said the command (use null for internal calls, to ignore checking)
     */
  selectWinner(index, player) {
    // don't allow if game is paused
    if (this.state === STATES.PAUSED) {
      this.say('Game is currently paused.');
      return false;
    }

    // clear winner timer
    clearInterval(this.winnerTimer);

    const winner = this.table.answer[index];
    if (this.state === STATES.PLAYED) {
      if (typeof player !== 'undefined' && player !== this.czar) {
        this.say(
          `${player.nick}: You are not the card czar. Only the card czar can select the winner`,
        );
      } else if (typeof winner === 'undefined') {
        this.say('Invalid winner');
      } else {
        this.state = STATES.ROUND_END;
        const owner = winner.cards[0].owner;
        owner.points += 1;
        // announce winner
        this.say(
          `${c.bold('Winner is: ') + owner.nick} with "${this.getFullEntry(
            this.table.question,
            winner.getCards(),
          )}" and gets one awesome point! ${owner.nick} has ${owner.points} awesome ${inflection.inflect(
            'point',
            owner.points,
          )}.`,
        );

        const round = this.dbCurrentRound;
        this.setWinnerDatabase(round, owner);

        this.clean();
        this.nextRound();
      }
    }
  }

  /**
     * Get formatted entry
     * @param question
     * @param answers
     * @returns {*|Object|ServerResponse}
     */
  getFullEntry({ value }, answers) {
    const args = [value];
    _.forEach(
      answers,
      _.bind(answer => {
        args.push(answer.value);
      }, this),
    );
    return util.format.apply(this, args);
  }

  /**
     * Check if all active players played on the current round
     * @returns Boolean true if all players have played
     */
  checkAllPlayed() {
    let allPlayed = false;
    if (this.getNotPlayed().length === 0) {
      allPlayed = true;
    }
    return allPlayed;
  }

  /**
     * Check if decks are empty & reset with discards
     */
  checkDecks() {
    // check answer deck
    if (this.decks.answer.numCards() === 0) {
      console.log('answer deck is empty. reset from discard.');
      this.decks.answer.reset(this.discards.answer.reset());
      this.decks.answer.shuffle();
    }
    // check question deck
    if (this.decks.question.numCards() === 0) {
      console.log('question deck is empty. reset from discard.');
      this.decks.question.reset(this.discards.question.reset());
      this.decks.question.shuffle();
    }
  }

  /**
     * Add a player to the game
     * @param player Player object containing new player's data
     * @returns The new player or false if invalid player
     */
  addPlayer(player) {
    if (this.config.gameOptions.database === true && _.isUndefined(this.dbGame)) {
      this.playersToAdd.push(player);
    } else if (
      _.isUndefined(
        this.getPlayer({ nick: player.nick, hostname: player.hostname, isActive: true }),
      )
    ) {
      // Returning players
      const oldPlayer = _.find(this.players, {
        nick    : player.nick,
        hostname: player.hostname,
        isActive: false,
      });
      if (!_.isUndefined(oldPlayer)) {
        if (oldPlayer.idleCount >= this.config.gameOptions.idleLimit) {
          this.say(`${player.nick}: You have idled too much and have been banned from this game.`);
          return false;
        }

        if (
          _.filter(this.players, { isActive: true }).length >= this.config.gameOptions.maxPlayers
        ) {
          this.say(
            `${player.nick}: You cannot join right now as the maximum number of players have joined the game`,
          );
          return false;
        }
        oldPlayer.isActive = true;
      } else {
        if (
          _.filter(this.players, { isActive: true }).length >= this.config.gameOptions.maxPlayers
        ) {
          this.say(
            `${player.nick}: You cannot join right now as the maximum number of players have joined the game`,
          );
          return false;
        }
        this.players.push(player);
        if (this.state !== STATES.WAITING) {
          this.players[this.players.length - 1].hasPlayed = true;
        }
      }

      this.say(`${player.nick} has joined the game`);

      // check if waiting for players
      if (this.state === STATES.WAITING && _.filter(this.players, { isActive: true }).length >= 3) {
        // enough players, start the game
        this.nextRound();
      }

      this.createPlayerDatabaseRecord(player);
      return player;
    }

    return false;
  }

  /**
     * Find player
     * @param search
     * @returns {*}
     */
  getPlayer(search) {
    return _.find(this.players, search);
  }

  /**
     * Remove player from game
     * @param player
     * @param options Extra options
     * @returns The removed player or false if invalid player
     */
  removePlayer(player, args) {
    const options = _.assignIn({}, args);
    if (!_.isUndefined(player) && player.isActive) {
      console.log(`removing${player.nick} from the game`);
      // get cards in hand
      const cards = player.cards.reset();
      // remove player
      player.isActive = false;
      // put player's cards to discard
      _.forEach(cards, card => {
        console.log('Add card ', card.text, 'to discard');
        this.discards.answer.addCard(card);
      });
      if (options.silent !== true) {
        this.say(`${player.nick} has left the game`);
      }

      if (_.filter(this.players, { isActive: true }).length === 0) {
        this.say('No Players left');
        this.stop();
        return false;
      }

      // check if remaining players have all player
      if (this.state === STATES.PLAYABLE && this.checkAllPlayed()) {
        this.showEntries();
      }

      // check czar
      if (this.state === STATES.PLAYED && this.czar === player) {
        this.say('The czar has fled the scene. So I will pick the winner on this round.');
        this.selectWinner(Math.round(Math.random() * (this.table.answer.length - 1)));
      }

      // check if everyone has left the game
      const activePlayers = _.filter(this.players, ({ isActive }) => isActive);
      if (activePlayers.length === 0) {
        this.stop();
      }

      return player;
    }
    return false;
  }

  /**
     * Get all player who have not played
     * @returns Array list of Players that have not played
     */
  getNotPlayed() {
    return _.filter(
      // check only players with cards (so players who joined in the middle of a round are ignored)
      _.filter(this.players, ({ cards }) => cards.numCards() > 0),
      { hasPlayed: false, isCzar: false, isActive: true },
    );
  }

  /**
     * Check for inactive players
     */
  markInactivePlayers() {
    _.forEach(
      this.getNotPlayed(),
      _.bind(player => {
        player.inactiveRounds += 1;
      }, this),
    );
  }

  /**
     * Show players cards to player
     * @param player
     */
  showCards(player) {
    if (!_.isUndefined(player)) {
      let cardsZeroToSix = 'Your cards are:';
      let cardsSevenToTwelve = '';
      _.forEach(
        player.cards.getCards(),
        _.bind(({ value }, index) => {
          if (index < 7) {
            cardsZeroToSix += c.bold(` [${index}] `) + value;
          } else {
            cardsSevenToTwelve += `${c.bold(`[${index}] `) + value} `;
          }
        }, this),
      );

      this.pm(player.nick, cardsZeroToSix);
      this.pm(player.nick, cardsSevenToTwelve);
    }
  }

  /**
     * Show points for all players
     */
  showPoints() {
    const sortedPlayers = _.sortBy(this.players, ({ points }) => -points);
    let output = '';
    _.forEach(sortedPlayers, ({ nick, points }) => {
      output += `${nick} ${points} awesome ${inflection.inflect('point', points)}, `;
    });
    this.say(`The most horrible people: ${output.slice(0, -2)}`);
  }

  /**
     * Show status
     */
  showStatus() {
    // amount of player needed to start the game
    const timeLeft =
      this.config.gameOptions.secondsBeforeStart -
      Math.round((new Date().getTime() - this.startTime.getTime()) / 1000);

    // players who have not played yet
    const activePlayers = _.filter(this.players, ({ isActive }) => isActive);
    const playersNeeded = Math.max(0, 3 - activePlayers.length);

    const notPlayed = _.filter(activePlayers, { isCzar: false, hasPlayed: false, isActive: true });
    switch (this.state) {
      case STATES.PLAYABLE:
        this.say(
          `${c.bold('Status: ') + this.czar.nick} is the czar. Waiting for ${inflection.inflect(
            'players',
            _.map(notPlayed, 'nick').length,
          )} to play: ${_.map(notPlayed, 'nick').join(', ')}`,
        );
        break;
      case STATES.PLAYED:
        this.say(`${c.bold('Status: ')}Waiting for ${this.czar.nick} to select the winner.`);
        break;
      case STATES.ROUND_END:
        this.say(`${c.bold('Status: ')}Round has ended and next one is starting.`);
        break;
      case STATES.STARTED:
        this.say(
          `${c.bold('Status: ')}Game starts in ${timeLeft} ${inflection.inflect(
            'seconds',
            timeLeft,
          )}. Need ${playersNeeded} more ${inflection.inflect('players', playersNeeded)} to start.`,
        );
        break;
      case STATES.STOPPED:
        this.say(`${c.bold('Status: ')}Game has been stopped.`);
        break;
      case STATES.WAITING:
        this.say(
          `${c.bold(
            'Status: ',
          )}Not enough players to start. Need ${playersNeeded} more ${inflection.inflect(
            'players',
            playersNeeded,
          )} to start.`,
        );
        break;
      case STATES.PAUSED:
        this.say(`${c.bold('Status: ')}Game is paused.`);
        break;
      default:
        break;
    }
  }

  /**
     * Set the channel topic
     */
  setTopic(topic) {
    // ignore if not configured to set topic
    if (_.isUndefined(this.config.gameOptions.setTopic) || !this.config.gameOptions.setTopic) {
      return false;
    }

    // construct new topic
    let newTopic = topic;
    if (_.isUndefined(this.config.gameOptions.topicBase)) {
      newTopic = `${topic} ${this.config.gameOptions.topicBase}`;
    }

    // set it
    this.client.send('TOPIC', this.channel, newTopic);
  }

  /**
     * List all players in the current game
     */
  listPlayers() {
    const activePlayers = _.filter(this.players, ({ isActive }) => isActive);

    if (activePlayers.length > 0) {
      this.say(`Players currently in the game: ${_.map(activePlayers, 'nick').join(', ')}`);
    } else {
      this.say('No players currently in the game');
    }
  }

  /**
     * Helper function for the handlers below
     */
  findAndRemoveIfPlaying(nick) {
    const player = this.getPlayer({ nick });
    if (!_.isUndefined(player)) this.removePlayer(player);
  }

  /**
     * Handle player parts
     * @param channel
     * @param nick
     */
  playerPartHandler(chan, nick) {
    console.log(`Player ${nick} left`);
    this.findAndRemoveIfPlaying(nick);
  }

  /**
     * Handle player kicks
     * @param nick
     * @param by
     */
  playerKickHandler(nick, by) {
    console.log(`Player ${nick} was kicked by ${by}`);
    this.findAndRemoveIfPlaying(nick);
  }

  /**
     * Handle player kicks
     * @param nick
     */
  playerQuitHandler(nick) {
    console.log(`Player ${nick} left`);
    this.findAndRemoveIfPlaying(nick);
  }

  /**
   * Handle player nick changes
   * @param {String} oldnick old nick of player
   * @param {String} newnick new nick of player
   */
  playerNickChangeHandler(oldnick, newnick) {
    console.log(`Player changed nick from ${oldnick} to ${newnick}`);
    const player = this.getPlayer({ nick: oldnick });
    if (!_.isUndefined(player)) player.nick = newnick;
    this.updatePlayerDatabaseRecord(player);
  }

  /**
   * Notify users in channel that game has started
   */
  notifyUsers() {
    // request names
    this.client.send('NAMES', this.channel);

    // signal handler to send notifications
    this.notifyUsersPending = true;
  }

  /**
   * Handle names response to notify users
   * @param {String} nicks user to notify
   */
  notifyUsersHandler(nicks) {
    // ignore if we haven't requested this
    if (this.notifyUsersPending === false) return false;
    // don't message nicks with these modes
    const exemptModes = ['~', '&'];

    // loop through and send messages
    _.forEach(nicks, (mode, nick) => {
      if (_.includes(exemptModes, mode) && nick !== this.config.botOptions.nick) {
        this.notice(
          nick,
          `${nick}: A new game of Cards Against Humanity just began in ${this
            .channel}. Head over and !join if you'd like to get in on the fun!`,
        );
      }
    });

    // reset
    this.notifyUsersPending = false;
  }

  /**
   * Public message to the game channel
   * @param {String} string message to send to channel
   */
  say(string) {
    this.client.say(this.channel, string);
  }

  /**
   * Public message to the game channel
   * @param {String} nick nick or channel to send notice
   * @param {String} string message to send to channel
   */
  pm(nick, string) {
    this.client.say(nick, string);
  }

  /**
   * Public notice to the game channel or nick
   * @param {String} nick nick or channel to send notice
   * @param {String} string message to send to channel
   */
  notice(nick, string) {
    this.client.notice(nick, string);
  }
}

// export static state constant
Game.STATES = STATES;

export default Game;
