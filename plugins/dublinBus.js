import dBus from '../pluginCode/dublinBus';

export default function connect(app, callback) {
  dBus(app);
  callback();
}
