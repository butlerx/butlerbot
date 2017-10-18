import _ from 'lodash';
import inflection from 'inflection';
import mathjs from 'mathjs';
import dictionary from '../../config/dictionary.json';
import conundrums from '../../config/conundrums.json';

const STATES = {
  STOPPED: 'Stopped',
  STARTED: 'Started',
  LETTERS: 'Letters',
  NUMBERS: 'Numbers',
  CONUNDRUM: 'Conundrum',
  PLAYED: 'Played',
  PLAY_LETTERS: 'Play letters',
  PLAY_NUMBERS: 'Play numbers',
  LETTERS_ROUND_END: 'Letters round end',
  NUMBERS_ROUND_END: 'Numbers round end',
  WAITING: 'Waiting',
  SELECTING: 'Selecting',
};

const seconds = sec => sec * 1000;

class Game {
  constructor(
    channel,
    client,
    config,
    challenger,
    challenged,
    lettersTime,
    numbersTime,
    conundrumsTime,
  ) {
    this.round = 0; // Round number
    this.channel = channel;
    this.client = client;
    this.config = config;
    this.state = STATES.STARTED;
    this.idleWaitCount = 0;
    this.challenger = challenger;
    this.challenged = challenged;
    this.lettersTime = lettersTime;
    this.numbersTime = numbersTime;
    this.conundrumsTime = conundrumsTime;
    this.vowel_array = ['A', 'E', 'I', 'O', 'U'];
    this.valid_numbers_characters = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      ' ',
      '+',
      '-',
      '*',
      '/',
      '(',
      ')',
    ];
    this.conundrumAns = false;

    console.log(this.channel);
    console.log(
      `letters: ${this.lettersTime} numbers: ${this.numbersTime} conundrum: ${this.conundrumsTime}`,
    );

    console.log('Loading dictionary');

    this.dictionary = dictionary.words;
    this.conundrums = conundrums.words;
    this.countdown_words = _.filter(this.dictionary, ({ length }) => length <= 9);
    this.conundrum_words = _.shuffle(_.map(this.conundrums, word => word.toUpperCase()));

    console.log('loading alphabet');

    // Load vowels
    this.vowels = [];

    Object.entries(this.config.letterOptions.vowels).forEach(([letter, num]) => {
      for (let i = 0; i < num; i += 1) {
        this.consonants.push(letter);
      }
    });

    this.consonants = [];

    // Load consonants
    Object.entries(this.config.letterOptions.consonants).forEach(([letter, num]) => {
      for (let i = 0; i < num; i += 1) {
        this.consonants.push(letter);
      }
    });

    this.vowels = _.shuffle(_.shuffle(this.vowels));
    this.consonants = _.shuffle(_.shuffle(this.consonants));

    console.log('Loading numbers');

    this.small = _.shuffle(_.shuffle(this.config.numberOptions.small));
    this.large = _.shuffle(_.shuffle(this.config.numberOptions.large));

    // Selections
    this.table = {
      letters: [],
      numbers: [],
      target: 0,
      conundrum: null,
    };

    // Discards
    this.discards = {
      consonants: [],
      vowels: [],
    };

    // Answers
    this.answers = {
      challenged: {},
      challenger: {},
    };
    // client listeners
    client.addListener('part', this.playerPartHandler);
    client.addListener('quit', this.playerQuitHandler);
    client.addListener(`kick${channel}`, this.playerKickHandler);
    client.addListener('nick', this.playerNickChangeHandler);
  }
  /*
   * Stop the game
   */
  stop(player, gameEnded) {
    console.log('Stopping the game');

    // If a particular player ended the game output say so
    if (this.challenger.nick === player || this.challenged.nick === player) {
      this.say(`${player} stopped the game.`);
    }

    if (this.round > 1 && gameEnded !== true) {
      this.say(
        `${this.challenged.nick} has ${this.challenged.points} points while ${this.challenger
          .nick} has ${this.challenger.points} points.`,
      );
    }

    if (this.state === STATES.conundrum && gameEnded !== true) {
      this.say(`No one got the conundrum. The answer was ${this.table.conundrum}`);
    }

    this.state = STATES.STOPPED;

    if (gameEnded !== true) {
      this.say('Game has been stopped.');
    }

    this.setTopic('No game running!');

    // Clear timeouts
    clearTimeout(this.stopTimeout);
    clearTimeout(this.conundrumTimeout);
    clearInterval(this.roundTimer);

    // Remove listeners
    this.client.removeListener('part', this.playerPartHandler);
    this.client.removeListener('quit', this.playerQuitHandler);
    this.client.removeListener(`kick${this.channel}`, this.playerKickHandler);
    this.client.removeListener('nick', this.playerNickChangeHandler);
  }

  /*
   * Show the winner and stop the game
   */
  showWinner() {
    if (this.challenger.points > this.challenged.points) {
      this.say(
        `${this.challenger.nick} has won the game with ${this.challenger
          .points} ${inflection.inflect('point', this.challenger.points)}! While ${this.challenged
          .nick} got ${this.challenged.points} ${inflection.inflect(
          'point',
          this.challenged.points,
        )}! Congratulations!`,
      );
    } else if (this.challenged.points > this.challenger.points) {
      this.say(
        `${this.challenged.nick} has won the game with ${this.challenged
          .points} ${inflection.inflect('point', this.challenged.points)}! While ${this.challenger
          .nick} got ${this.challenger.points} ${inflection.inflect(
          'point',
          this.challenger.points,
        )}! Congratulations!`,
      );
    } else {
      this.say("The game has ended in a tie! Perhaps there'll be a rematch?");
    }
    this.stop(null, true);
  }

  /**
   * Start next round
   */
  nextRound() {
    clearTimeout(this.stopTimeout);

    // check that there's enough players in the game and end if we have waited the
    if (this.challenger.hasJoined === false) {
      this.say(
        `Waiting for ${this.challenger.nick}. Stopping in ${this.config.gameOptions
          .minutesBeforeStart} ${inflection.inflect(
          'minute',
          this.config.gameOptions.minutesBeforeStart,
        )} if they don't join.`,
      );

      this.state = STATES.WAITING;
      // stop game if not enough pleyers in however many minutes in the config
      this.stopTimeout = setTimeout(
        this.stop,
        seconds(60) * this.config.gameOptions.minutesBeforeStart,
      );
      return false;
    }

    if (
      this.challenger.idleCount === this.config.gameOptions.maxIdleCount &&
      this.challenged.idleCount === this.config.gameOptions.maxIdleCount
    ) {
      this.say('Both players have idled too many times. Neither player wins');
      this.stop();
      return false;
    } else if (this.challenger.idleCount === this.config.gameOptions.maxIdleCount) {
      this.say(
        `${this.challenger.nick} has idled too many times. ${this.challenged
          .nick} has won by default.`,
      );
      this.stop();
      return false;
    } else if (this.challenged.idleCount === this.config.gameOptions.maxIdleCount) {
      this.say(
        `${this.challenged.nick} has idled too many times. ${this.challenger
          .nick} has won by default.`,
      );
      this.stop();
      return false;
    }

    this.round += 1;
    this.showPoints();
    console.log('Starting round ', this.round);
    this.challenger.hasPlayed = false;
    this.challenger.isLocked = false;
    this.challenged.hasPlayed = false;
    this.challenged.isLocked = false;

    if (_.includes(this.config.roundOptions.letters, this.round)) {
      console.log('Letters round');
      this.lettersRound();
    } else if (_.includes(this.config.roundOptions.numbers, this.round)) {
      console.log('Numbers round');
      this.numbersRound();
    } else {
      console.log('Conundrum round');
      this.say(
        `Starting conundrum in ${this.config.roundOptions
          .secondsBeforeConundrum} ${inflection.inflect(
          'second',
          this.config.roundOptions.secondsBeforeConundrum,
        )}`,
      );
      this.conundrumTimeout = setTimeout(
        this.conundrumRound,
        seconds(this.config.roundOptions.secondsBeforeConundrum),
      );
    }
  }

  /*
   * Do round end
   * Check words are in dictionary
   * Declare round winner
   * Start next round
   */
  roundEnd() {
    clearInterval(this.roundTimer);

    console.log(this.challenger.hasPlayed);
    console.log(this.challenged.hasPlayed);

    if (
      this.challenger.hasPlayed !== true &&
      this.state !== STATES.CONUNDRUM &&
      this.challenger.isLocked !== true
    ) {
      this.say(`${this.challenger.nick} has idled.`);
      this.challenger.idleCount += 1;
    }

    if (
      this.challenged.hasPlayed !== true &&
      this.state !== STATES.CONUNDRUM &&
      this.challenged.isLocked !== true
    ) {
      this.say(`${this.challenged.nick} has idled.`);
      this.challenged.idleCount += 1;
    }

    if (this.state === STATES.PLAY_LETTERS) {
      this.state = STATES.LETTERS_ROUND_END;
      if (this.challenger.hasPlayed !== true) {
        this.answers.challenger = { word: this.table.letters.join(''), valid: false };
      }
      if (this.challenged.hasPlayed !== true) {
        this.answers.challenged = { word: this.table.letters.join(''), valid: false };
      }
      this.letterRoundEnd();
      this.nextRound();
    } else if (this.state === STATES.PLAY_NUMBERS) {
      this.state = STATES.NUMBERS_ROUND_END;
      if (this.challenger.hasPlayed !== true) {
        this.answers.challenger = { value: this.table.target + 20 };
      }
      if (this.challenged.hasPlayed !== true) {
        this.answers.challenged = { value: this.table.target + 20 };
      }
      this.numberRoundEnd();
      this.nextRound();
    } else if (this.state === STATES.CONUNDRUM) {
      if (this.conundrumAns !== true) {
        this.say(`No one got the conundrum. The answer was ${this.table.conundrum}`);
        this.conundrumAns = false;
      }
      if (this.challenged.points !== this.challenger.points) {
        this.showWinner();
      } else {
        this.nextRound();
      }
    }
  }

  letterRoundEnd() {
    // Show selections
    console.log('In letterRoundEnd');

    if (this.challenger.hasPlayed === true) {
      this.say(`${this.challenger.nick} has played: ${this.answers.challenger.word}`);
    }
    if (this.challenged.hasPlayed === true) {
      this.say(`${this.challenged.nick} has played: ${this.answers.challenged.word}`);
    }

    // If both words are valid
    if (this.answers.challenger.valid === true && this.answers.challenged.valid === true) {
      // If both words are the same length
      if (this.answers.challenger.word.length === this.answers.challenged.word.length) {
        // If word is 9 characters
        if (this.answers.challenger.word.length === 9) {
          this.say('Both players have scored 18 points this round.');
          this.challenger.points += 18;
          this.challenged.points += 18;
        } else {
          // If word is less than 9 characters
          this.say(
            `Both players have scored ${this.answers.challenger.word.length} points this round.`,
          );
          this.challenger.points += this.answers.challenger.word.length;
          this.challenged.points += this.answers.challenged.word.length;
        }
      } else if (this.answers.challenger.word.length > this.answers.challenged.word.length) {
        // If challenger word is longer
        // If word is 9 characters
        if (this.answers.challenger.word.length === 9) {
          this.say(`${this.challenger.nick} has won this round and scored 18 points/`);
          this.challenger.points += 18;
        } else {
          // If word is less than 9 characters
          this.say(
            `${this.challenger.nick} has won this round and scored ${this.answers.challenger.word
              .length} points.`,
          );
          this.challenger.points += this.answers.challenger.word.length;
        }
      } else if (this.answers.challenged.word.length > this.answers.challenger.word.length) {
        // If challenged word is longer
        // If word is 9 characters
        if (this.answers.challenged.word.length === 9) {
          this.say(`${this.challenged.nick} has won this round and scored 18 points.`);
          this.challenged.points += 18;
        } else {
          // If word is less than 9 characters
          this.say(
            `${this.challenged.nick} has won this round and scored ${this.answers.challenged.word
              .length} points.`,
          );
          this.challenged.points += this.answers.challenged.word.length;
        }
      }
    } else if (this.answers.challenger.valid === true) {
      // If challenger word is valid
      if (this.challenged.hasPlayed === true && this.answers.challenged.valid === false) {
        console.log('Challenged word invalid');
        this.say(`${this.challenged.nick}: Your word was invalid`);
      }

      // If word is 9 characters
      if (this.answers.challenger.word.length === 9) {
        this.say(`${this.challenger.nick} has won this round and scored 18 points.`);
        this.challenger.points += 18;
      } else {
        // If word is less than 9 characters
        this.say(
          `${this.challenger.nick} has won this round and scored ${this.answers.challenger.word
            .length} points.`,
        );
        this.challenger.points += this.answers.challenger.word.length;
      }
    } else if (this.answers.challenged.valid === true) {
      // If challenged word is valid
      if (this.challenger.hasPlayed === true && this.answers.challenger.valid === false) {
        console.log('Challenger word invalid');
        this.say(`${this.challenger.nick}: Your word was invalid.`);
      }

      // If word is 9 characters
      if (this.answers.challenged.word.length === 9) {
        this.say(`${this.challenged.nick} has won this round and scored 18 points/`);
        this.challenged.points += 18;
      } else {
        // If word is less than 9 characters
        this.say(
          `${this.challenged.nick} has won this round and scored ${this.answers.challenged.word
            .length} points.`,
        );
        this.challenged.points += this.answers.challenged.word.length;
      }
    } else {
      // If neither word is valid
      this.say('Neither player played a valid word and have scored 0 points');
    }

    for (
      let letter = this.table.letters.pop();
      !_.isUndefined(letter);
      letter = this.table.letters.pop()
    ) {
      if (_.includes(this.vowel_array, letter)) {
        this.discards.vowels.push(letter);
      } else {
        this.discards.consonants.push(letter);
      }
    }

    this.answers = {
      challenger: {},
      challenged: {},
    };
  }

  numberRoundEnd() {
    const challengerDifference =
      Math.max(this.table.target, this.answers.challenger.value) -
      Math.min(this.table.target, this.answers.challenger.value);
    const challengedDifference =
      Math.max(this.table.target, this.answers.challenged.value) -
      Math.min(this.table.target, this.answers.challenged.value);

    if (challengedDifference > 10 && challengerDifference > 10) {
      this.say('No player has gotten within 10 of the target and no points have been awarded');
    } else if (challengerDifference < challengedDifference) {
      if (this.answers.challenger.value === this.table.target) {
        this.say(
          `${this.challenger.nick} has hit the target of ${this.table.target} with ${this.answers
            .challenger.expression} and receives 10 points.`,
        );
        this.challenger.points += 10;
      } else if (challengerDifference <= 5) {
        this.say(
          `${this.challenger
            .nick} has gotten within ${challengerDifference} of the target with ${this.answers
            .challenger.expression} = ${this.answers.challenger.value} and receives 7 points.`,
        );
        this.challenger.points += 7;
      } else if (challengerDifference <= 10) {
        this.say(
          `${this.challenger
            .nick} has gotten within ${challengerDifference} of the target with ${this.answers
            .challenger.expression} = ${this.answers.challenger.value} and receives 5 points.`,
        );
        this.challenger.points += 5;
      }
    } else if (challengedDifference < challengerDifference) {
      if (this.answers.challenged.value === this.table.target) {
        this.say(
          `${this.challenged.nick} has hit the target of ${this.table.target} with ${this.answers
            .challenged.expression} and receives 10 points.`,
        );
        this.challenged.points += 10;
      } else if (challengedDifference <= 5) {
        this.say(
          `${this.challenged
            .nick} has gotten within ${challengedDifference} of the target with ${this.answers
            .challenged.expression} = ${this.answers.challenged.value} and receives 7 points.`,
        );
        this.challenged.points += 7;
      } else if (challengedDifference <= 10) {
        this.say(
          `${this.challenged
            .nick} has gotten within ${challengedDifference} of the target with ${this.answers
            .challenged.expression} = ${this.answers.challenged.value} and receives 5 points.`,
        );
        this.challenged.points += 5;
      }
    } else if (challengedDifference === challengerDifference) {
      if (
        this.answers.challenger.value === this.table.target &&
        this.answers.challenged.value === this.table.target
      ) {
        this.say(
          `${this.challenged.nick} hit the target of ${this.table.target} with ${this.answers
            .challenged.expression}`,
        );
        this.say(
          `${this.challenger.nick} hit the target of ${this.table.target} with ${this.answers
            .challenger.expression}`,
        );
        this.say('Both players have hit the target and scored 10 points.');
        this.challenger.points += 10;
        this.challenged.points += 10;
      } else if (challengedDifference <= 5 && challengerDifference <= 5) {
        this.say(
          `${this.challenged
            .nick} has gotten within ${challengedDifference} of the target with ${this.answers
            .challenged.expression} = ${this.answers.challenged.value} and receives 7 points.`,
        );
        this.say(
          `${this.challenger
            .nick} has gotten within ${challengerDifference} of the target with ${this.answers
            .challenger.expression} = ${this.answers.challenger.value} and receives 7 points.`,
        );
        this.challenged.points += 7;
        this.challenger.points += 7;
      } else if (challengedDifference <= 10 && challengerDifference <= 10) {
        this.say(
          `${this.challenged
            .nick} has gotten within ${challengedDifference} of the target with ${this.answers
            .challenged.expression} = ${this.answers.challenged.value} and receives 5 points.`,
        );
        this.say(
          `${this.challenger
            .nick} has gotten within ${challengerDifference} of the target with ${this.answers
            .challenger.expression} = ${this.answers.challenger.value} and receives 5 points.`,
        );
        this.challenged.points += 5;
        this.challenger.points += 5;
      }
    }

    for (
      let number = this.table.numbers.pop();
      !_.isUndefined(number);
      number = this.table.numbers.pop()
    ) {
      if (_.includes(this.config.numberOptions.small, number)) {
        this.small.push(number);
      } else {
        this.large.push(number);
      }
    }

    this.answers = {
      challenger: {},
      challenged: {},
    };

    this.small = _.shuffle(_.shuffle(this.small));
    this.large = _.shuffle(_.shuffle(this.large));
  }

  setSelector() {
    if (this.round === 1) {
      // Set the selector as the player who accepted the challenge
      this.challenged.selectRound = true;
      this.challenger.selectRound = false;
    } else {
      this.challenged.selectRound = !this.challenged.selectRound;
      this.challenger.selectRound = !this.challenger.selectRound;
    }

    this.selector = this.challenged.selectRound ? this.challenged : this.challenger;
  }

  /*
   * Do setup for a letters round
   */
  lettersRound() {
    this.state = STATES.LETTERS;
    this.say(`Round ${this.round}: Letters`);

    this.setSelector();

    this.say(`${this.selector.nick} will choose the letters for this round.`);
    this.say(
      `${this.selector
        .nick}: Choose the letters for this round with a command similar to: !cd ccvcvccvv`,
    );
    this.say(`${this.selector.nick}: Where c is a consonant and v is a vowel.`);
  }

  /*
   * Process letter selection by player
   */
  letters(player, letters) {
    if (this.selector.nick === player) {
      if (letters.length !== 9) {
        this.say('You must provide a selection of 9 consonants or vowels.');
        return false;
      }

      if (_.reject(letters, letter => letter === 'c' || letter === 'v').length !== 0) {
        this.say('Your selection should consist only of the letters c and v');
        return false;
      }
      // check minimum Vowels
      if (
        _.reject(letters, letter => letter === 'c').length < this.config.roundOptions.minimumVowels
      ) {
        this.say(`You must have ${this.config.roundOptions.minimumVowels} or more vowels`);
        return false;
      }
      // check minimum constant
      if (
        _.reject(letters, letter => letter === 'v').length <
        this.config.roundOptions.minimumConstant
      ) {
        this.say(`You must have ${this.config.roundOptions.minimumConstant} or more constant`);
        return false;
      }

      if (this.vowels.length < 9) {
        this.vowels.concat = this.vowels.concat(_.shuffle(this.discards.vowels));
        this.discards.vowels = [];
      }

      if (this.consonants.length < 9) {
        this.consonants = this.consonants.concat(_.shuffle(this.discards.consonants));
        this.discards.consonants = [];
      }

      _.forEach(letters, (letter) => {
        if (letter.toLowerCase() === 'c') {
          this.table.letters.push(this.consonants.shift().toUpperCase());
        } else if (letter.toLowerCase() === 'v') {
          this.table.letters.push(this.vowels.shift().toUpperCase());
        }
      });

      clearInterval(this.roundTimer);
      this.say(`Letters for this round: ${this.table.letters.join(' ')}`);
      if (!_.isUndefined(this.lettersTime)) {
        this.say(
          `${this.lettersTime * 60} ${inflection.inflect(
            'second',
            this.lettersTime * 60,
          )} on the clock`,
        );
      } else {
        this.say(
          `${this.config.roundOptions.lettersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.roundMinutes,
          )} on the clock`,
        );
      }

      this.pm(this.challenger.nick, `Letters for this round: ${this.table.letters.join(' ')}`);
      if (!_.isUndefined(this.lettersTime)) {
        this.pm(
          this.challenger.nick,
          `${this.lettersTime * 60} ${inflection.inflect(
            'second',
            this.lettersTime * 60,
          )} on the clock`,
        );
      } else {
        this.pm(
          this.challenger.nick,
          `${this.config.roundOptions.lettersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.roundMinutes,
          )} on the clock`,
        );
      }
      this.pm(this.challenger.nick, 'Play a word with !cd [word]');

      this.pm(this.challenged.nick, `Letters for this round: ${this.table.letters.join(' ')}`);
      this.pm(this.challenged.nick, 'Play a word with !cd [word]');
      if (!_.isUndefined(this.lettersTime)) {
        this.pm(
          this.challenged.nick,
          `${this.lettersTime * 60} ${inflection.inflect(
            'second',
            this.lettersTime * 60,
          )} on the clock`,
        );
      } else {
        this.pm(
          this.challenged.nick,
          `${this.config.roundOptions.lettersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.roundMinutes,
          )} on the clock`,
        );
      }

      this.state = STATES.PLAY_LETTERS;
      clearInterval(this.roundTimer);
      this.roundStarted = new Date();
      this.roundTimer = setInterval(this.roundTimerCheck, seconds(10));
    }
  }

  playLetters(player, wrd) {
    const word = wrd.toUpperCase();
    if (this.challenger.nick === player || this.challenged.nick === player) {
      if (
        (this.challenger.nick === player && this.challenger.isLocked === true) ||
        (this.challenged.nick === player && this.challenged.isLocked === true)
      ) {
        this.pm(
          player,
          'You cannot play anymore words as you have locked in your answer for this round',
        );
        return false;
      }

      // If letter is too long/short and uses letters not available to the player
      if (word.length <= 2 || word.length > 9) {
        this.pm(
          player,
          'Your word must be between 3 and 9 letters long and only use the characters available for this round.',
        );
        return false;
      }

      // Make sure the player didn't reuse any letters
      const letters = _.clone(this.table.letters);
      let valid = true;

      for (let i = 0; i < word.length; i += 1) {
        if (_.includes(letters, word[i].toUpperCase())) {
          console.log(letters);
          letters.splice(_.indexOf(letters, word[i]), 1);
        } else {
          valid = false;
          break;
        }
      }

      if (valid !== true) {
        this.pm(
          player,
          'Your word must not reuse any letters more than they appear, and must only use letters that have been slected for this round',
        );
        return false;
      }
      if (this.challenger.nick === player) {
        this.answers.challenger = {
          word,
          valid: _.includes(this.countdown_words, word.toUpperCase()),
        };
        this.challenger.hasPlayed = true;
      } else if (this.challenged.nick === player) {
        this.answers.challenged = {
          word,
          valid: _.includes(this.countdown_words, word.toUpperCase()),
        };
        this.challenged.hasPlayed = true;
      }

      this.pm(player, `You played: ${word}. Good luck.`);
      console.log(this.answers);
    }
  }

  /*
   * Do setup for a numbers round
   */
  numbersRound() {
    this.state = STATES.NUMBERS;
    this.say(`Round ${this.round}: Numbers`);

    this.setSelector();

    this.say(`${this.selector.nick} will choose the Numbers for this round.`);
    this.say(
      `${this.selector
        .nick}: Choose the Numbers for this round with a command similar to: !cd lslsss`,
    );
    this.say(`${this.selector.nick}: Where l is a large number and s is a small number.`);
  }

  /*
   * Process number selection by player
   */
  numbers(player, numbers) {
    if (this.selector.nick === player) {
      if (numbers.length !== 6) {
        this.say('You must provide a selection of 6 numbers.');
        return false;
      }

      if (_.reject(numbers, number => number === 'l' || number === 's').length !== 0) {
        this.say('Your selection should consist only of the letters l and s');
        return false;
      }

      if (_.filter(numbers, number => number === 'l').length > 4) {
        this.say('Your selection should have a maximum of 4 large numbers');
        return false;
      }

      _.forEach(numbers, (number) => {
        if (number.toLowerCase() === 'l') {
          this.table.numbers.push(this.large.shift());
        } else if (number.toLowerCase() === 's') {
          this.table.numbers.push(this.small.shift());
        }
      });

      this.table.target = Math.floor(Math.random() * 899) + 100;

      clearInterval(this.roundTimer);
      this.say(
        `Numbers for this round: ${this.table.numbers.join(' ')} and the target is: ${this.table
          .target}`,
      );
      if (!_.isUndefined(this.numbersTime)) {
        this.say(
          `${this.numbersTime * 60} ${inflection.inflect(
            'second',
            this.numbersTime * 60,
          )} on the clock`,
        );
      } else {
        this.say(
          `${this.config.roundOptions.numbersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.numbersRoundMinutes,
          )} on the clock`,
        );
      }

      this.pm(
        this.challenger.nick,
        `Numbers for this round: ${this.table.numbers.join(' ')} and the target is: ${this.table
          .target}`,
      );
      if (!_.isUndefined(this.numbersTime)) {
        this.pm(
          this.challenger.nick,
          `${this.numbersTime * 60} ${inflection.inflect(
            'second',
            this.numbersTime * 60,
          )} on the clock`,
        );
      } else {
        this.pm(
          this.challenger.nick,
          `${this.config.roundOptions.numbersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.numbersRoundMinutes,
          )} on the clock`,
        );
      }
      this.pm(this.challenger.nick, 'Play an equation with !cd [equation]');

      this.pm(
        this.challenged.nick,
        `Numbers for this round: ${this.table.numbers.join(' ')} and the target is: ${this.table
          .target}`,
      );
      if (!_.isUndefined(this.numbersTime)) {
        this.pm(
          this.challenged.nick,
          `${this.numbersTime * 60} ${inflection.inflect(
            'second',
            this.numbersTime * 60,
          )} on the clock`,
        );
      } else {
        this.pm(
          this.challenged.nick,
          `${this.config.roundOptions.numbersRoundMinutes} ${inflection.inflect(
            'minute',
            this.config.roundOptions.numbersRoundMinutes,
          )} on the clock`,
        );
      }
      this.pm(this.challenged.nick, 'Play an equation with !cd [equation]');

      this.state = STATES.PLAY_NUMBERS;
      clearInterval(this.roundTimer);
      this.roundStarted = new Date();
      this.roundTimer = setInterval(this.roundTimerCheck, seconds(10));
    }
  }

  playNumbers(player, expression) {
    console.log(`Expression: ${expression}`);
    if (this.challenger.nick === player || this.challenged.nick === player) {
      // If the expression uses no numbers
      const playerNumbers = expression.match(/\d+/g);

      if (playerNumbers === null) {
        this.pm(player, 'Your expression does not contain any numbers');
        return false;
      }

      // If the expression uses invalid characters
      if (
        _.reject(expression, number => _.includes(this.valid_numbers_characters, number) === true)
          .length !== 0
      ) {
        this.pm(player, 'Your expression contains illegal characters');
        return false;
      }

      // If the expression uses numbers that are not in the selected numbers or reuses numbers
      const numbers = _.clone(this.table.numbers);
      let valid = true;

      for (let i = 0; i < playerNumbers.length; i += 1) {
        if (_.includes(numbers, playerNumbers[i])) {
          console.log(numbers);
          numbers.splice(_.indexOf(numbers, playerNumbers[i]), 1);
        } else {
          valid = false;
          break;
        }
      }

      if (valid !== true) {
        this.pm(
          player,
          'Your expression must only use selected numbers and must not reuse numbers more times than they appear',
        );
        return false;
      }

      try {
        mathjs.eval(expression);
      } catch (ex) {
        this.pm(player, 'Your expression has some invalid syntax, please check and resubmit.');
        return false;
      }

      // If the expression isn't a whole number or isn't positive
      if (mathjs.eval(expression) <= 0) {
        this.pm(
          player,
          `Your expression results in a negative number. Your expression result is:${mathjs.eval(
            expression,
          )}`,
        );
        return false;
      }

      if (mathjs.eval(expression) % 1 !== 0) {
        this.pm(
          player,
          `Your expression does not result in a whole number. Your expression result is: ${mathjs.eval(
            expression,
          )}`,
        );
        return false;
      }

      if (this.challenger.nick === player) {
        this.answers.challenger = { expression, value: mathjs.eval(expression) };
        this.challenger.hasPlayed = true;
      } else if (this.challenged.nick === player) {
        this.answers.challenged = { expression, value: mathjs.eval(expression) };
        this.challenged.hasPlayed = true;
      }

      this.pm(
        player,
        `You have submitted ${expression}. Your result is ${mathjs.eval(expression)}`,
      );
    }
  }

  /*
   * Do setup for a conundrum round
   */
  conundrumRound() {
    this.say(`Round ${this.round}: Conundrum`);

    this.table.conundrum = this.conundrum_words.shift();

    this.challenger.hasBuzzed = false;
    this.challenged.hasBuzzed = false;

    if (
      Math.max(this.challenger.points, this.challenged.points) -
        Math.min(this.challenger.points, this.challenged.points) <=
      10
    ) {
      this.say("Fingers on buzzers for today's crucial countdown conundrum");
    } else {
      this.say("Fingers on buzzers for today's countdown conundrum");
    }
    this.say('Use !buzz word to guess the conundrum.');
    this.say(`Conundrum: ${_.shuffle(this.table.conundrum).join(' ')}`);

    this.state = STATES.CONUNDRUM;
    clearInterval(this.roundTimer);
    this.roundStarted = new Date();
    this.roundTimer = setInterval(this.roundTimerCheck, seconds(10));
  }

  playConundrum(player, userWord) {
    if (this.challenged.nick === player || this.challenger.nick === player) {
      const word = userWord.toUpperCase();
      if (this.challenged.nick === player) {
        if (this.challenged.hasBuzzed === false) {
          if (this.table.conundrum === word) {
            this.say(
              `${player} has correctly guessed the countdown conundrum and scored 10 points`,
            );
            this.challenged.points += 10;
            this.conundrumAns = true;
            this.roundEnd();
          } else {
            // Make sure the player didn't reuse any letters
            const letters = _.clone(this.table.conundrum.split(''));
            let valid = true;

            for (let i = 0; i < word.length; i += 1) {
              if (_.includes(letters, word[i].toUpperCase())) {
                console.log(letters);
                letters.splice(_.indexOf(letters, word[i]), 1);
              } else {
                valid = false;
                break;
              }
            }

            if (valid === true && _.includes(this.conundrum_words, word)) {
              this.say(
                `${player} has correctly guessed the countdown conundrum and scored 10 points`,
              );
              this.challenged.points += 10;
              this.conundrumAns = true;
              this.roundEnd();
            } else {
              this.say(`${player} has incorrectly guessed the countdown conundrum`);
              this.challenged.hasBuzzed = true;
            }
          }
        } else {
          this.say(`${player} has already Buzzed`);
        }
      } else {
        if (this.challenger.hasBuzzed === false) {
          if (this.table.conundrum === word) {
            this.say(
              `${player} has correctly guessed the countdown conundrum and scored 10 points`,
            );
            this.challenger.points += 10;
            this.conundrumAns = true;
            this.roundEnd();
          } else {
            // Make sure the player didn't reuse any letters
            const letters = _.clone(this.table.conundrum.split(''));
            let valid = true;

            for (let i = 0; i < word.length; i += 1) {
              if (_.includes(letters, word[i].toUpperCase())) {
                console.log(letters);
                letters.splice(_.indexOf(letters, word[i]), 1);
              } else {
                valid = false;
                break;
              }
            }

            if (valid === true && _.includes(this.conundrum_words, word)) {
              this.say(
                `${player} has correctly guessed the countdown conundrum and scored 10 points`,
              );
              this.challenger.points += 10;
              this.conundrumAns = true;
              this.roundEnd();
            } else {
              this.say(`${player} has incorrectly guessed the countdown conundrum`);
              this.challenger.hasBuzzed = true;
            }
          }
        } else {
          this.say(`${this.challenger.nick} has already Buzzed`);
        }

        if (this.challenger.hasBuzzed && this.challenged.hasBuzzed) {
          this.say('Both players have buzzed. Ending the round');
          this.roundEnd();
        }
      }
    }
  }

  roundTimerCheck() {
    // Check the time
    const now = new Date();
    let timeLimit;

    if (this.state === STATES.PLAY_LETTERS) {
      if (!_.isUndefined(this.lettersTime)) {
        timeLimit = seconds(60) * this.lettersTime;
      } else if (!_.isUndefined(this.config.roundOptions.lettersRoundMinutes)) {
        timeLimit = seconds(60) * this.config.roundOptions.lettersRoundMinutes;
      } else {
        timeLimit = seconds(60) * 2;
      }
    } else if (this.state === STATES.PLAY_NUMBERS) {
      if (!_.isUndefined(this.numbersTime)) {
        timeLimit = seconds(60) * this.numbersTime;
      } else if (!_.isUndefined(this.config.roundOptions.numbersRoundMinutes)) {
        timeLimit = seconds(60) * this.config.roundOptions.numbersRoundMinutes;
      } else {
        timeLimit = seconds(60) * 5;
      }
    } else if (this.state === STATES.CONUNDRUM) {
      if (!_.isUndefined(this.conundrumsTime)) {
        timeLimit = seconds(60) * this.conundrumsTime;
      } else if (!_.isUndefined(this.config.roundOptions.conundrumRoundMinutes)) {
        timeLimit = seconds(60) * this.config.roundOptions.conundrumRoundMinutes;
      } else {
        timeLimit = seconds(60) * 2;
      }
    }

    const roundElapsed = now.getTime() - this.roundStarted.getTime();
    console.log(`Round elapsed: ${roundElapsed}`, now.getTime(), this.roundStarted.getTime());

    if (roundElapsed >= timeLimit) {
      this.say('DO DO DO D-D-DOOOO');
      this.roundEnd();
      // Do something
    } else if (roundElapsed >= timeLimit - seconds(10) && roundElapsed < timeLimit) {
      this.say('10 seconds left!');
      this.pm(this.challenger.nick, '10 seconds left');
      this.pm(this.challenged.nick, '10 seconds left');
    } else if (roundElapsed >= timeLimit - seconds(20) && roundElapsed < timeLimit - seconds(10)) {
      this.say('20 seconds left!');
      this.pm(this.challenger.nick, '20 seconds left');
      this.pm(this.challenged.nick, '20 seconds left');
    } else if (roundElapsed >= timeLimit - seconds(30) && roundElapsed < timeLimit - seconds(20)) {
      this.say('30 seconds left!');
      this.pm(this.challenger.nick, '30 seconds left');
      this.pm(this.challenged.nick, '30 seconds left');
    } else if (roundElapsed >= timeLimit - seconds(60) && roundElapsed < timeLimit - seconds(50)) {
      this.say('1 minute left!');
      this.pm(this.challenger.nick, '1 minute left');
      this.pm(this.challenged.nick, '1 minute left');
    }
  }

  /**
   * Add a player to the game
   * @param player Player object containing new player's data
   * @returns The new player or false if invalid player
   */
  addPlayer(player) {
    console.log(`Adding player: ${player.nickx}`);
    if (this.challenger.nick === player.nick) {
      this.challenger.hasJoined = true;
      console.log('Adding challenger');
    } else if (this.challenged.nick === player.nick) {
      this.challenged.hasJoined = true;
      console.log('Adding challenged');
    } else {
      this.say('Sorry, but you cannot join this game');
      return false;
    }

    this.say(`${player.nick} has joined the game.`);
    this.nextRound();
    return player;
  }

  lock(player) {
    if (this.challenger.nick === player) {
      if (this.challenger.isLocked !== true) {
        this.say(`${player} has locked in their answer`);
        this.challenger.isLocked = true;
      }
    } else if (this.challenged.nick === player) {
      if (this.challenged.isLocked !== true) {
        this.say(`${player} has locked in their answer`);
        this.challenged.isLocked = true;
      }
    }

    if (this.challenger.isLocked && this.challenged.isLocked) {
      this.say('Both players have locked their answers. Ending the round');
      this.roundEnd();
    }
  }

  /*
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

  showPoints() {
    if (this.round === 0) {
      this.say("The game hasn't begun yet");
    } else {
      this.setTopic(
        `Round ${this.round}: ${this.challenged.nick} has ${this.challenged
          .points} points while ${this.challenger.nick} has ${this.challenger.points} points.`,
      );
    }
  }

  /**
   * Helper function for the handlers below
   * @param nick
   */
  findAndRemoveIfPlaying(nick) {
    if (this.challenger.nick === nick || this.challenged.nick === nick) {
      this.stop(nick, false);
    }
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
   * @param oldnick
   * @param newnick
   */
  playerNickChangeHandler(oldnick, newnick) {
    if (this.challenger.nick === oldnick) {
      this.challenger.nick = newnick;
      return true;
    } else if (this.challenged.nick === oldnick) {
      this.challenged.nick = newnick;
      return true;
    }

    return false;
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
