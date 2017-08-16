import cah from '../plugin_code/cards_against_humanity/setup';

export default function connect(app, callback) {
  cah(app);
  callback();
}
