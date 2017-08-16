import bookclup from '../plugin_code/bookclub/setup';

export default function connect(app, callback) {
  bookclup(app);
  callback();
}
