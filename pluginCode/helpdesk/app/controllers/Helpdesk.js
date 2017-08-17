import request from 'request-promise';
import cheerio from 'cheerio';
import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class Helpdesk {
  constructor() {
    this.config = config[env];
  }

  help(client, { args, nick }, cmdArgs) {
    let channel = args[0];
    if (channel === client.nick) channel = nick;
    const input = cmdArgs.split(' ', 1);
    if (input[0] === '') {
      client.say(
        channel,
        'Helpdesk is a bot to help with all your problems pm me !help for a list of commads',
      );
      return false;
    }
    const options = {
      uri      : this.config.wiki + input[0],
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
  }

  list(client, { args, nick }) {
    const channel = args[0] === client.nick ? nick : args[0];
    const commands = this.config.commands.join(', ');
    const pmCommands = this.config.pmCommands.join(', ');
    client.say(channel, `The commands are ${commands} and pm only commands are ${pmCommands}`);
  }
}

export default Helpdesk;
