import announce from '../plugin_code/announce/setup';

export default function connect(app, callback) {
  announce(app);
  callback();
}
