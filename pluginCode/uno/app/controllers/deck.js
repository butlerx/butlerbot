import _ from 'lodash';
import Card from '../models/card';
import cards from '../../config/cards.json';

class Deck {
  constructor(deck) {
    this.cards = [];

    if (deck === true) {
      _.forEach(cards, card => {
        this.cards.push(new Card(card));
      });
    } else {
      this.cards = [];
    }
  }

  shuffle() {
    this.cards = _.shuffle(_.shuffle(this.cards));
  }

  addCard(card) {
    this.cards.push(card);
  }

  removeCard(card) {
    if (_.isUndefined(card)) return false;
    this.cards = _.without(this.cards, card);
    return card;
  }

  checkPlayable(index, currentCard) {
    return this.cards[index].isPlayable(currentCard);
  }
  getCard(index) {
    return this.cards[index];
  }

  pickCard(index) {
    const card = this.cards[index];
    this.removeCard(card);
    return card;
  }

  deal() {
    return this.cards.pop();
  }
  getCurrentCard() {
    return this.cards[this.cards.length - 1];
  }
  getCards() {
    return this.cards;
  }
  numCards() {
    return this.cards.length;
  }
}

export default Deck;
