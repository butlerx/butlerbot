const Announce = require('./app/controllers/announce.js');

module.exports = app => {
  const redbrickCommittee = new Announce();
  app.joinChannels(redbrickCommittee.announce.channelsToJoin);
};
