import _ from 'lodash';
import fs from 'fs-extra';
import Game from './game';
import Player from '../models/player';
import challenges from '../../config/challenges.json';

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.json')[env];

class Countdown {
  constructor() {
    this.config = config;
    this.challenges = challenges;
    this.challengesFile = 'plugin_code/countdown/config/challenges.json';
  }

  accept(client, message, cmdArgs) {
    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      const channel = message.args[0];

      const games = _.filter(
        this.challenges,
        ({ challenged }) => challenged.toLowerCase() === message.nick.toLowerCase(),
      );
      const challengers = _.map(games, ({ challenger }) => challenger);
      const letterTimes = _.map(games, ({ letter }) => letter);
      const numberTimes = _.map(games, ({ number }) => number);
      const conundrumTimes = _.map(games, ({ conundrum }) => conundrum);

      if (cmdArgs === '') {
        if (challengers.length === 1) {
          const challenger = new Player(challengers[0]);
          const challenged = new Player(message.nick);
          const letterTime = letterTimes[0];
          const numberTime = numberTimes[0];
          const conundrumTime = conundrumTimes[0];
          this.game = new Game(
            channel,
            client,
            this.config,
            challenger,
            challenged,
            letterTime,
            numberTime,
            conundrumTime,
          );
          this.game.addPlayer(challenged);
        } else {
          this.list(client, message, cmdArgs);
        }
      } else if (!_.includes(challengers, cmdArgs.toLowerCase())) {
        client.say(channel, `You haven't been challenged by ${cmdArgs}. Challenging...`);
        this.challenge(client, message, cmdArgs);
      } else {
        const challenger = new Player(cmdArgs);
        const challenged = new Player(message.nick);
        const letterTime = letterTimes[0];
        const numberTime = numberTimes[0];
        const conundrumTime = conundrumTimes[0];
        this.game = new Game(
          channel,
          client,
          this.config,
          challenger,
          challenged,
          letterTime,
          numberTime,
          conundrumTime,
        );
        client.say(
          channel,
          `letters: ${letterTime * 60} numbers: ${numberTime * 60} conundrum: ${conundrumTime *
            60}`,
        );
        this.game.addPlayer(challenged);
      }
    } else {
      client.say('Sorry, challenges cannot currently be accepted');
    }
  }

  buzz(client, { args, nick }, cmdArgs) {
    if (!_.isUndefined(this.game) && this.game.state === Game.STATES.CONUNDRUM) {
      if (_.isUndefined(cmdArgs)) {
        client.say(args[0], 'Please supply a word to the buzz function');
        return false;
      }
      this.game.playConundrum(nick, cmdArgs);
    } else {
      client.say(args[0], 'Sorry, the !buzz command is not available right now');
    }
  }

  challenge(client, message, cmdArgs) {
    const channel = message.args[0];
    const args = cmdArgs.split(' ', 6);
    const validNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    let letterTime = this.config.roundOptions.lettersRoundMinutes;
    let numberTime = this.config.roundOptions.numbersRoundMinutes;
    let conundrumTime = this.config.roundOptions.conundrumRoundMinutes;

    if (args[0] === '') {
      client.say(channel, 'Please supply a nick with this command');
    } else if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(channel, "You can't challenge the bot");
    } else if (message.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(channel, "You can't challenge yourself");
    } else if (
      !_.isUndefined(
        _.find(this.challenges, {
          challenger: args[0].toLowerCase(),
          challenged: message.nick.toLowerCase(),
        }),
      )
    ) {
      this.accept(client, message, args[0]); // move accept in here
    } else if (
      !_.includes(this.challenges, {
        challenger: message.nick.toLowerCase(),
        challenged: args[0].toLowerCase(),
      })
    ) {
      args.forEach(argRaw => {
        const arg = argRaw.split(':');
        if (_.reject(arg[1], number => _.includes(validNumbers, number) === true).length !== 0) {
          client.say(channel, `The ${arg[0]} isnt valid`);
          if (arg[0].toLowerCase() === 'letters') {
            letterTime = this.config.roundOptions.lettersRoundMinutes;
          } else if (arg[0].toLowerCase() === 'numbers') {
            numberTime = this.config.roundOptions.numbersRoundMinutes;
          } else if (arg[0].toLowerCase() === 'conundrum') {
            conundrumTime = this.config.roundOptions.conundrumRoundMinutes;
          }
        } else if (arg[0].toLowerCase() === 'letters') {
          letterTime = arg[1] / 60;
        } else if (arg[0].toLowerCase() === 'numbers') {
          numberTime = arg[1] / 60;
        } else if (arg[0].toLowerCase() === 'conundrum') {
          conundrumTime = arg[1] / 60;
        }
      });
      this.challenges.push({
        challenger: message.nick,
        challenged: args[0],
        letter    : letterTime,
        number    : numberTime,
        conundrum : conundrumTime,
      });
      fs.writeFile(this.challengesFile, JSON.stringify(this.challenges, null, 2));
      client.say(channel, `${message.nick}: has challenged ${args[0]}`);
      client.say(
        channel,
        `${args[0]}: To accept ${message.nick}'s challenge, simply !accept ${message.nick}`,
      );
    } else {
      client.say(channel, `${message.nick}: You have already challenged ${args[0]}.`);
    }
  }

  join(client, { nick, user, host, args }) {
    if (!_.isUndefined(this.game) && this.game.state === Game.STATES.WAITING) {
      const player = new Player(nick, user, host);
      this.game.addPlayer(player);
      this.challenges = _.reject(
        this.challenges,
        ({ challenger, challenged }) =>
          challenger === this.game.challenger.nick && challenged === this.game.challenged.nick,
      );
      fs.writeFile(this.challengesFile, JSON.stringify(this.challenges, null, 2));
    } else {
      client.say(args[0], 'Unable to join at the moment.');
    }
  }

  list(client, { args, nick }) {
    if (this.challenges.length === 0) {
      client.say(args[0], 'No challenges have been issued.');
    } else {
      let challengesSent = _.filter(this.challenges, ({ challenger }) => challenger === nick);
      let challengesReceived = _.filter(this.challenges, ({ challenged }) => challenged === nick);

      if (challengesSent.length < 1) {
        client.say(args[0], `${nick}: You have issued no challenges.`);
      } else {
        challengesSent = _.map(challengesSent, ({ challenged }) => challenged);
        client.say(
          args[0],
          `${nick}: You have issued challenges to the following players: ${challengesSent.join(
            ', ',
          )}.`,
        );
      }

      if (challengesReceived.length < 1) {
        client.say(args[0], `${nick}: You have received no challenges.`);
      } else {
        challengesReceived = _.map(challengesReceived, ({ challenger }) => challenger);
        client.say(
          args[0],
          `${nick}: You have been challenged by the following players: ${challengesReceived.join(
            ', ',
          )}.`,
        );
      }
    }
  }

  lock(client, { nick, args }) {
    if (
      !_.isUndefined(this.game) &&
      (this.game.state === Game.STATES.PLAY_LETTERS || this.game.state === Game.STATES.PLAY_NUMBERS)
    ) {
      this.game.lock(nick);
    } else {
      client.say(args[0], 'The lock command is not available right now.');
    }
  }

  play(client, message, cmdArgs) {
    if (!_.isUndefined(this.game) && this.game.state === Game.STATES.PLAY_LETTERS) {
      if (cmdArgs === '') {
        client.say(message.args[0], 'Please supply arguments to the !cd command.');
        return false;
      }
      const args = cmdArgs.split(' ').join('');
      this.game.playLetters(message.nick, args);
    } else if (!_.isUndefined(this.game) && this.game.state === Game.STATES.PLAY_NUMBERS) {
      if (_.isUndefined(cmdArgs)) {
        client.say(message.args[0], 'Please supply arguments to the !cd command.');
        return false;
      }

      this.game.playNumbers(message.nick, cmdArgs);
    } else {
      client.say(message.args[0], 'The !cd command is not available at the moment');
    }
  }

  select(client, message, cmd) {
    const cmdArgs = cmd.toLowerCase();
    if (!_.isUndefined(this.game) && this.game.state === Game.STATES.LETTERS) {
      if (cmdArgs === '') {
        client.say(message.args[0], 'Please supply arguments to the !cd command');
        return false;
      }
      const args = cmdArgs.replace(/\s/g, '').split('');
      this.game.letters(message.nick, args);
    } else if (!_.isUndefined(this.game) && this.game.state === Game.STATES.NUMBERS) {
      if (cmdArgs === '') {
        client.say(message.args[0], 'Please supply arguments to the !cd command');
        return false;
      }
      const args = cmdArgs.replace(/\s/g, '').split('');
      this.game.numbers(message.nick, args);
    } else {
      client.say(message.args[0], 'The select command is not available at the moment');
    }
  }

  stop(client, { args, nick }) {
    const channel = args[0];

    if (_.isUndefined(this.game) || this.game.state === Game.STATES.STOPPED) {
      client.say(args[0], 'No game running to stop.');
    } else if (this.game.challenger.nick === nick || this.game.challenged.nick === nick) {
      this.game.stop(nick, false);
    } else {
      client.say(channel, 'Only the players can stop the game');
    }
  }

  wiki(client, { args, nick }) {
    if (client.nick.toLowerCase() === args[0].toLowerCase()) {
      client.say(nick, 'https://github.com/butlerx/butlerbot/wiki/Countdown');
    } else {
      client.say(args[0], `${nick}: https://github.com/butlerx/butlerbot/wiki/Countdown`);
    }
    return this;
  }
}

export default Countdown;
