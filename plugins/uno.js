import uno from '../plugin_code/uno/setup';

export default function connect(app, callback) {
  uno(app);
  callback();
}
