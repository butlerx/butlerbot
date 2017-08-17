import bookclub from '../pluginCode/bookclub';

export default function connect(app, callback) {
  bookclub(app);
  callback();
}
