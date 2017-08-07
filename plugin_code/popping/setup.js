const Popping = require('./app/controllers/popping.js');

module.exports = app => {
  const popping = new Popping();
  app.joinChannels(popping.config.channelsToJoin);
  app.cmd('pop', '', popping.config.channels, popping.config.channelsToExclude, popping.pop);
};
