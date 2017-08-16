import _ from 'lodash';
import Card from '../models/card';

class Cards {
  constructor(allCards) {
    this.cards = [];
    // add all cards in init array
    _.forEach(allCards, c => {
      let card;
      if (c instanceof Card) {
        card = c;
      } else if ({}.hasOwnProperty.call(c, 'value')) {
        card = new Card(c);
      } else {
        console.error('Invalid card', c);
      }
      this.cards.push(card);
    });
  }

  /**
     * Reset the collection
     * @param cards Optional replacement list of cards
     * @returns {Array} Array of the old, replaced cards
     */
  reset(cards) {
    let hand = cards;
    if (_.isUndefined(hand)) hand = [];
    const oldCards = this.cards;
    this.cards = hand;
    return oldCards;
  }

  /**
     * Shuffle the cards
     * @returns {Cards} The shuffled collection
     */
  shuffle() {
    this.cards = _.shuffle(this.cards);
  }

  /**
     * Add card to collection
     * @param card
     * @returns {*}
     */
  addCard(card) {
    this.cards.push(card);
    return card;
  }

  /**
     * Remove a card from the collection
     * @param card
     * @returns {*}
     */
  removeCard(card) {
    if (!_.isUndefined(card)) this.cards = _.without(this.cards, card);
    return card;
  }

  /**
     * Pick cards from the collection
     * @param cardIndex (int|Array) Index of a single card, of Array of multiple indexes to remove and return
     * @returns {Card|Cards} Instance of a single card, or instance of Cards if multiple indexes picked
     */
  PickCard(cardIndex) {
    let index = cardIndex;
    if (_.isUndefined(index)) index = 0;
    if (_.isArray(index)) {
      // get multiple cards
      const pickedCards = new Cards();
      // first get all cards
      _.forEach(
        index,
        _.bind(i => {
          const c = this.cards[i];
          if (_.isUndefined(c)) throw new Error('Invalid card index');
          pickedCards.addCard(c);
        }, this),
      );
      // then remove them
      this.cards = _.without.apply(this, _.union([this.cards], pickedCards.cards));
      //            _.forEach(pickedCards, function(card) {
      //                this.cards.removeCard(card);
      //            }, this);
      console.log('picked cards:');
      console.log(_.map(pickedCards.cards, 'id'));
      console.log(_.map(pickedCards.cards, 'value'));
      console.log('remaining cards:');
      console.log(_.map(this.cards, 'id'));
      console.log(_.map(this.cards, 'value'));
      return pickedCards;
    }
    const card = this.cards[index];
    this.removeCard(card);
    return card;
  }

  /**
     * Get all cards in collection
     * @returns {Array}
     */
  getCards() {
    return this.cards;
  }

  /**
     * Get amount of cards in collection
     * @returns {Number}
     */
  numCards() {
    return this.cards.length;
  }
}

export default Cards;
