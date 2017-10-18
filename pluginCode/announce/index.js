import Announce from './app/controllers/announce';

export default (app) => {
  const announce = new Announce();
  app.joinChannels(announce.config.channelsToJoin);
};
