import _ from 'lodash';
import Cards from '../controllers/cards';

class Player {
  constructor(nick, user, hostname) {
    this.id = _.uniqueId('card');
    this.nick = nick;
    this.user = user;
    this.hostname = hostname;
    this.cards = new Cards();
    this.hasPlayed = false;
    this.hasDiscarded = false;
    this.isCzar = false;
    this.isActive = true;
    this.idleCount = 0;
    this.points = 0;
    this.inactiveRounds = 0;
  }
}

export default Player;
