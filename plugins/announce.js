import announce from '../pluginCode/announce';

export default function connect(app, callback) {
  announce(app);
  callback();
}
