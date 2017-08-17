import _ from 'lodash';
import models from '../models';

const cardFixes = [];

_.forEach(cardFixes, ({ correctText, wrongText }) => {
  models.Card.update({ text: correctText }, { where: { text: wrongText } });
});
