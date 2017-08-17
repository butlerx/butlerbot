/* eslint-env and, mocha */

import _ from 'lodash';
import assert from 'assert';
import config from '../config';

describe('Cards', () => {
  describe('value', () => {
    it('should not be blank', () => {
      _.forEach(config.cards, ({ value }) => {
        assert.notEqual(value, '');
      });
    });

    it('should not be duplicated', () => {
      if (_.difference(config.cards, _.uniqBy(config.cards, ({ value }) => value)).length !== 0) {
        console.log(
          _.map(
            _.difference(config.cards, _.uniqBy(config.cards, ({ value }) => value)),
            ({ value }) => value,
          ),
        );
      }

      assert.equal(
        0,
        _.difference(config.cards, _.uniqBy(config.cards, ({ value }) => value)).length,
      );
    });
  });
});
