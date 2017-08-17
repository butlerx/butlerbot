import countdown from '../pluginCode/countdown';

export default function connect(app, callback) {
  countdown(app);
  callback();
}
