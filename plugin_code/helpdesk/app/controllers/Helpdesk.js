const request = require('request-promise');
const cheerio = require('cheerio');

const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config.json')[env];

function Helpdesk() {
  const self = this;
  self.config = config;

  self.help = (client, { args, nick }, cmdArgs) => {
    let channel = args[0];
    if (channel === client.nick) {
      channel = nick;
    }
    const input = cmdArgs.split(' ', 1);
    if (input[0] === '') {
      client.say(
        channel,
        'Helpdesk is a bot to help with all your problems pm me !help for a list of commads',
      );
      return false;
    }
    const options = {
      uri      : self.config.wiki + input[0],
      transform: body => cheerio.load(body),
    };
    request(options)
      .then($ => {
        if ($('.noarticletext').exists('p')) {
          client.say(channel, 'Sorry theres no help for that');
          return;
        }
        client.say(nick, $('.mw-content-ltr').children().first().text());
        client.say(channel, options.uri);
      })
      .catch(err => {
        console.log(`We’ve encountered an error: ${err}`);
      });
  };

  self.list = (client, { args, nick }) => {
    const channel = args[0] === client.nick ? nick : args[0];
    const commands = self.config.commands.join(', ');
    const pmCommands = self.config.pmCommands.join(', ');
    client.say(channel, `The commands are ${commands} and pm only commands are ${pmCommands}`);
  };
}

module.exports = Helpdesk;
