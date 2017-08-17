import _ from 'lodash';

class Player {
  constructor(nick) {
    this.id = _.uniqueId('player');
    this.nick = nick;
    this.hasJoined = false;
    this.hasPlayed = false;
    this.points = 0;
    this.isActive = true;
    this.selectRound = false;
    this.hasSelected = false;
    this.hasBuzzed = false;
    this.isLocked = false;
    this.idleCount = 0;
  }
}

export default Player;
