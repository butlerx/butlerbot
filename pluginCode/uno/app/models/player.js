import Deck from '../controllers/deck';

export default class Player {
  constructor(nick, user, hostname) {
    this.nick = nick;
    this.user = user;
    this.hostname = hostname;
    this.points = 0;
    this.idleTurns = 0;
    this.hand = new Deck(false);
    this.skipped = false;
    this.hasPlayed = false;
    this.hasDrawn = false;
    this.hasChallenged = false;
    this.uno = false;
    this.challengable = false;
  }
}
