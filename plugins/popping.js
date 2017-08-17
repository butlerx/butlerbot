import pop from '../pluginCode/popping';

export default function connect(app, callback) {
  pop(app);
  callback();
}
