import cah from '../pluginCode/cardsAgainstHumanity';

export default function connect(app, callback) {
  cah(app);
  callback();
}
