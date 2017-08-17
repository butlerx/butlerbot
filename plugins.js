import path from 'path';
import plug from 'plug';

export default app => {
  const plugger = plug.create(app);

  plugger.on('connect', pluginName => {
    console.log(`Loaded ${pluginName} plugin.`);
  });

  plugger.find(path.resolve(__dirname, 'pluginsEnabled'));
};
