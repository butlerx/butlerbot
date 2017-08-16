import helpdesk from '../plugin_code/helpdesk/setup';

export default function connect(app, callback) {
  helpdesk(app);
  callback();
}
