const _ = require('lodash');

function Player(nick) {
  const self = this;

  self.id = _.uniqueId('player');
  self.nick = nick;
  self.hasJoined = false;
  self.hasPlayed = false;
  self.points = 0;
  self.isActive = true;
  self.selectRound = false;
  self.hasSelected = false;
  self.hasBuzzed = false;
  self.isLocked = false;
  self.idleCount = 0;
}

module.exports = Player;
