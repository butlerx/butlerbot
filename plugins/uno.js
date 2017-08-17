import uno from '../pluginCode/uno';

export default function connect(app, callback) {
  uno(app);
  callback();
}
