import countdown from '../plugin_code/countdown/setup';

export default function connect(app, callback) {
  countdown(app);
  callback();
}
