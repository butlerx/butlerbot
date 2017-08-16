import pop from '../plugin_code/popping/setup';

export default function connect(app, callback) {
  pop(app);
  callback();
}
