import _ from 'lodash';
import Card from '../models/card';

/** Class for a collection of Card objetcs */
class Cards {
  /**
   * Contructor for Cards object
   * @param {Array} allCards array of cards to be added to collection
   */
  constructor(allCards) {
    this.cards = [];
    // add all cards in init array
    _.forEach(allCards, (c) => {
      if (c instanceof Card) {
        this.cards.push(c);
      } else if ({}.hasOwnProperty.call(c, 'value')) {
        this.cards.push(new Card(c));
      } else {
        console.error('Invalid card', c);
      }
    });
  }

  /**
   * Reset the collection
   * @param {Array} cards Optional replacement list of cards
   * @return {Array} Array of the old, replaced cards
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
   */
  shuffle() {
    this.cards = _.shuffle(this.cards);
  }

  /**
   * Add card to collection
   * @param {Object} card Card object to be added to collection
   * @return {Object} card that was added
   */
  addCard(card) {
    this.cards.push(card);
    return card;
  }

  /**
   * Remove a card from the collection
   * @param {Object} card Card to be removed
   * @return {Object} Card that was removed
   */
  removeCard(card) {
    if (!_.isUndefined(card)) this.cards = _.without(this.cards, card);
    return card;
  }

  /**
   * Pick cards from the collection
   * @param {number|Array} cardIndex Index of a single card, or Array of multiple indexes to remove and return
   * @return {Object} Instance of a single card, or instance of Cards if multiple indexes picked
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
        _.bind((i) => {
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
   * @return {Array}
   */
  getCards() {
    return this.cards;
  }

  /**
   * Get amount of cards in collection
   * @return {Number}
   */
  numCards() {
    return this.cards.length;
  }
}

export default Cards;
