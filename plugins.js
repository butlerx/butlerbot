const path = require('path');
const plug = require('plug');

module.exports = app => {
  const plugger = plug.create(app);

  plugger.on('connect', pluginName => {
    console.log(`Loaded ${pluginName} plugin.`);
  });

  plugger.find(path.resolve(__dirname, 'plugins_enabled'));
};
