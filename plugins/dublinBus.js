import dBus from '../plugin_code/dublinBus';

export default function connect(app, callback) {
  dBus(app);
  callback();
}
