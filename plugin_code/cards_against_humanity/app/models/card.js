import _ from 'lodash';

class Card {
  constructor({ type, draw, pick, value }) {
    this.id = _.uniqueId();
    this.type = type || '';
    this.draw = draw || 0;
    this.pick = pick || 0;
    this.value =
      value || 'A bug in the mainframe (please file a bug report, if you actually get this card)';
  }
}

export default Card;
