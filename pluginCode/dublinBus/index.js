import DublinBusInfo from './app/controllers/dublinBusInfo';

export default app => {
  const dublinBusInfo = new DublinBusInfo();
  app.joinChannels(dublinBusInfo.config.channelsToJoin);
  app.cmd(
    'dbus',
    '',
    dublinBusInfo.config.channels,
    dublinBusInfo.config.channelsToExclude,
    dublinBusInfo.showStopInfo,
  );
  app.cmd(
    'stop',
    '',
    dublinBusInfo.config.channels,
    dublinBusInfo.config.channelsToExclude,
    dublinBusInfo.showStopInfo,
  );
};
