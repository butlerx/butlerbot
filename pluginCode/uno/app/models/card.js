import c from 'irc-colors';

class Card {
  constructor({ type, color, value }) {
    this.type = type;
    this.color = color;
    this.value = value;
  }

  onPlay(game) {
    switch (this.type) {
      case 'Number':
        this.number(game);
        break;
      case 'Draw Two':
        this.drawTwo(game);
        break;
      case 'Reverse':
        this.reverse(game);
        break;
      case 'Skip':
        this.skip(game);
        break;
      case 'Wild':
        this.wild(game);
        break;
      case 'Wild Draw Four':
        this.wildDrawFour(game);
        break;
      default:
        break;
    }
  }

  isPlayable({ type, color, value }) {
    switch (type) {
      case 'Wild':
      case 'Wild Draw Four':
        return this.color === 'WILD' || color === 'WILD' || this.color === color;
      case 'Number':
        return this.color === 'WILD' || (this.color === color || this.value === value);
      case 'Skip':
      case 'Reverse':
      case 'Draw Two':
        return this.color === 'WILD' || (this.color === color || this.type === type);
      default:
        break;
    }
  }

  number(game) {
    game.firstCard = false;
    return this;
  }

  drawTwo(game) {
    if (game.firstCard === true) {
      game.firstCard = false;
      return this;
    }
    // Next player draws
    const nextPlayer = game.nextPlayer();
    game.deal(nextPlayer, 2, true);
    game.say(
      `${nextPlayer.nick} has picked up two cards and has ${nextPlayer.hand.numCards()} left`,
    );
    this.skip(game);
  }

  reverse(game) {
    // If only two players
    if (game.players.length === 2) {
      // Skip
      this.skip(game);
      return true;
    }
    if (game.firstCard === true) {
      game.firstCard = false;
      return true;
    }
    game.firstCard = false;
    // reverse game order
    game.players = game.players.reverse();
  }

  skip(game) {
    if (game.firstCard === true) {
      game.firstCard = false;
      return this;
    }
    game.firstCard = false;
    const nextPlayer = game.nextPlayer();
    nextPlayer.skipped = true;
    game.say(`${nextPlayer.nick} has been skipped!`);
  }

  wild(game) {
    // Color is handled by the play function so just return true
    game.firstCard = false;
    return this;
  }

  wildDrawFour(game) {
    if (game.firstCard === true) {
      game.firstCard = false;
      return true;
    }
    // Color setting is handled else where, so make next player draw four cards and skip them
    const nextPlayer = game.nextPlayer();
    // Next player draw
    game.deal(nextPlayer, 4, true);
    game.say(
      `${nextPlayer.nick} has picked up four cards and has ${nextPlayer.hand.numCards()} left`,
    );
    this.skip(game);
  }

  toString() {
    let cardString = '';
    switch (this.type) {
      case 'Number':
        cardString = `${this.color} ${this.value}`;
        break;
      case 'Skip':
        cardString = `${this.color} Skip`;
        break;
      case 'Reverse':
        cardString = `${this.color} Reverse`;
        break;
      case 'Draw Two':
        cardString = `${this.color} Draw Two`;
        break;
      case 'Wild':
        if (this.color !== 'WILD') {
          cardString += `${this.color} `;
        }
        cardString += 'Wild';
        break;
      case 'Wild Draw Four':
        if (this.color !== 'WILD') {
          cardString += `${this.color} `;
        }
        cardString += 'Wild Draw Four';
        break;
      default:
        break;
    }

    switch (this.color) {
      case 'YELLOW':
        cardString = c.bold.yellow(cardString);
        break;
      case 'GREEN':
        cardString = c.bold.green(cardString);
        break;
      case 'BLUE':
        cardString = c.bold.blue(cardString);
        break;
      case 'RED':
        cardString = c.bold.red(cardString);
        break;
      case 'WILD':
        cardString = c.bold.rainbow(cardString);
        break;
      default:
        break;
    }
    return cardString;
  }
}

export default Card;
