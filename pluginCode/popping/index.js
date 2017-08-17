import Popping from './app/controllers/popping';

export default app => {
  const popping = new Popping();
  app.joinChannels(popping.config.channelsToJoin);
  app.cmd('pop', '', popping.config.channels, popping.config.channelsToExclude, popping.pop);
};
