import plug from 'plug';
import Bot from './bot';
import pkg from '../package.json';

console.log(pkg.name, pkg.version);
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const bot = new Bot();
bot.init();

const plugger = plug.create(bot);

plugger.on('connect', pluginName => {
  console.log(`Loaded ${pluginName} plugin.`);
});

plugger.find(`${__dirname}/../pluginsEnabled`);
