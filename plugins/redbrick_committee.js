import cmt from '../plugin_code/redbrick_committee/setup';

export default function connect(app, callback) {
  cmt(app);
  callback();
}
