export default {
  production: {
    server: 'localhost',
    nick: 'butlerbot',
    connectCommands: [
      {
        target: 'nickserv',
        message: 'identify',
      },
    ],
    clientOptions: {
      userName: 'butlerx',
      port: '6697',
      floodProtection: true,
      floodProtectionDelay: 175,
    },
  },
  development: {
    server: 'localhost',
    nick: 'butlerDev',
    connectCommands: [
      {
        target: '',
        message: '',
      },
    ],
    clientOptions: {
      userName: 'butlerx',
      port: '6697',
      floodProtection: true,
      floodProtectionDelay: 175,
    },
  },
};
