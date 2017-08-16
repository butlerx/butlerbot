import dBus from '../plugin_code/dublin_bus/setup';

export default function connect(app, callback) {
  dBus(app);
  callback();
}
