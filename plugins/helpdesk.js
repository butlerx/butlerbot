import helpdesk from '../pluginCode/helpdesk';

export default function connect(app, callback) {
  helpdesk(app);
  callback();
}
