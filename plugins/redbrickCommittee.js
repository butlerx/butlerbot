import cmt from '../pluginCode/redbrickCommittee';

export default function connect(app, callback) {
  cmt(app);
  callback();
}
