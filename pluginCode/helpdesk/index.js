import Helpdesk from './app/controllers/helpdesk';

export default app => {
  const helpdesk = new Helpdesk();

  // Join Channels
  app.joinChannels(helpdesk.config.channelsToJoin);

  // Add commands
  app.cmd(
    'halpdack',
    '',
    helpdesk.config.channels,
    helpdesk.config.channelsToExclude,
    helpdesk.help,
  );
  app.cmd('list', '', helpdesk.config.channels, helpdesk.config.channelsToExclude, helpdesk.list);

  // PM commands
  app.msg('halpdack', '', helpdesk.help);
  app.msg('list', '', helpdesk.list);
};
