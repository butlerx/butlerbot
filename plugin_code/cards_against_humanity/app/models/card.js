const _ = require('lodash');

function Card(card) {
  const self = this;
  self.id = _.uniqueId();
  self.type = card.type || '';
  self.draw = card.draw || 0;
  self.pick = card.pick || 0;
  self.value =
    card.value ||
    'A bug in the mainframe (please file a bug report, if you actually get this card)';
}

module.exports = Card;
