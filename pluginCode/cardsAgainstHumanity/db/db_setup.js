import fs from 'fs-extra';
import JaySchema from 'jayschema';
import _ from 'lodash';
import path from 'path';
import development from '../config/env/development.json';
import production from '../config/env/production.json';
import { main, cardFiles, schema } from '../config';
import models from '../models';

const config = _.assignIn(
  {
    root : path.normalize(`${__dirname}/../..`),
    cards: [],
  },
  process.env.NODE_ENV === 'production' ? production : development,
);
// Init validator
const validator = new JaySchema();
// Define schema to calidate against

function updateOrCreateInstance(model, query, createFields, updateFields) {
  console.log(model);
  model.findOne(query).then(instance => {
    if (instance === null && createFields !== null) {
      model.create(createFields);
    } else if (instance !== null && updateFields !== null) {
      instance.update(updateFields);
    }
  });
}

/**
 * Load and validate a card file
 * @param identifier Identifier of the card file
 * @param filename Filename of the card file
 */
async function loadCardFile(identifier, filename) {
  console.log(`Loading ${identifier}: ${filename}`);
  try {
    if (!fs.exists(filename)) throw new Error('File does not exists');
    const data = await fs.readJson(filename);
    if (data.length === 0) return;
    validator.validate(data, schema, err => {
      if (err) throw new Error(`${identifier}: Validation error: ${err}`);
      console.log(`${identifier}: Validation OK!`);
      config.cards = _.union(config.cards, data);
      _.forEach(data, ({ type, value }) => {
        if (type.toLowerCase() === 'question') {
          updateOrCreateInstance(
            models.Card,
            { where: { text: value } },
            { text: value, times_played: 0, question: true },
            null,
          );
        } else if (type.toLowerCase() === 'answer') {
          updateOrCreateInstance(
            models.Card,
            { where: { text: value } },
            { text: value, times_played: 0, question: false },
            null,
          );
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

main().then(
  Object.entries(cardFiles).forEach(
    ([id, json]) =>
      (Object.prototype.hasOwnProperty.call(cardFiles, id) ? loadCardFile(id, json) : false),
  ),
);
