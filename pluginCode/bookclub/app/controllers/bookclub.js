import _ from 'lodash';
import fs from 'fs-extra';
import schedule from 'node-schedule';
import amazon from 'amazon-product-api';
import booksToRead from '../../config/booksToRead.json';
import booksRead from '../../config/booksRead.json';
import thisMonthBook from '../../config/thisMonthBook.json';
import nextMonthBook from '../../config/nextMonthBook.json';

import config from '../../config/config.json';

const env = process.env.NODE_ENV || 'development';

class Bookclub {
  constructor() {
    this.config = config[env];
    this.booksToRead = booksToRead;
    this.thisMonthBook = thisMonthBook;
    this.nextMonthBook = nextMonthBook;
    this.booksRead = booksRead;
    this.date = new Date();
    this.client = null;
    this.new = 0;
    this.keep = 0;
    this.voted = [];

    this.amazon = amazon.createClient({
      awsId    : process.env.AWSID || this.config.awsId,
      awsSecret: process.env.AWSSECRET || this.config.awsSecret,
      awsTag   : 'BookClub',
    });
    schedule.scheduleJob('0 0 1 * *', () => {
      if (this.client !== null) {
        console.log('Scheduled update');
        const month = this.date.getMonth();
        this.changeBook(this.client, month, this.config.channels[0]);
      } else {
        console.log('update failed');
      }
    });
  }

  thisMonth(client, { args }) {
    console.log('in thisMonth');
    const month = this.date.getMonth();
    this.client = client;
    if (month === this.thisMonthBook.month) {
      client.say(
        args[0],
        `This months book is ${this.thisMonthBook.title} by ${this.thisMonthBook.author}, ${this
          .thisMonthBook.link}`,
      );
    } else {
      this.changeBook(client, month, args[0]);
    }
  }

  nextMonth(client, { args }) {
    console.log('in nextMonth');
    const month = this.date.getMonth();
    this.client = client;
    if (month === this.thisMonthBook.month) {
      client.say(
        args[0],
        `Next months book is ${this.nextMonthBook.title} by ${this.nextMonthBook.author}, ${this
          .nextMonthBook.link}`,
      );
    } else {
      this.changeBook(client, month, args[0]);
    }
  }

  suggest(client, { args, nick }, cmdArgs) {
    console.log('in suggest');
    this.client = client;
    const input = cmdArgs.split('; ');

    if (input[0] === '') {
      client.say(args[0], 'You must provide a title');
      return false;
    }
    if (input.length !== 3) {
      if (input.length !== 2) {
        input.push('unknown');
        input.push(null);
      } else if (input.length === 2) {
        input.push(null);
      }
    }

    const books = _.filter(
      this.booksToRead,
      book => book.title.toLowerCase() === input[0].toLowerCase(),
    );
    const titles = _.map(books, book => book.title.toLowerCase());
    const read = _.filter(
      this.booksRead,
      book => book.title.toLowerCase() === input[0].toLowerCase(),
    );
    const titlesRead = _.map(read, book => book.title.toLowerCase());

    const title = input[0].toString();
    const author = input[1].toString();
    let pages = input[2];

    if (!_.isNumber(pages)) pages = null;
    if (
      _.includes(titlesRead, title.toLowerCase()) ||
      title.toLowerCase() === this.thisMonthBook.title.toLowerCase() ||
      title.toLowerCase() === this.nextMonthBook.title.toLowerCase()
    ) {
      client.say(args[0], 'That book has already been read');
    } else if (_.includes(titles, title.toLowerCase())) {
      client.say(args[0], 'That book has already been suggested');
    } else {
      this.amazon.itemSearch(
        {
          title,
          author,
          searchIndex: 'Books',
        },
        (err, results) => {
          let link;
          if (err) {
            console.log(err);
            link = 'No link found';
          } else {
            const result = results[0].DetailPageURL[0].split('%');
            link = result[0];
          }
          this.booksToRead.push({ title, author, pages, suggested: nick, month: 0, link });
          this.write('booksToRead', this.booksToRead);
          client.say(args[0], 'Book added!');
        },
      );
    }
  }

  changeBook(client, month, channel) {
    console.log('changing book');
    // add book to read list
    this.setTopic(
      client,
      channel,
      `This months book is ${this.nextMonthBook.title} by ${this.nextMonthBook
        .author} || This months discussion: ${this.thisMonthBook.title}`,
    );
    this.booksRead.push(thisMonthBook);
    this.write('booksRead', this.booksRead);
    // choose random book from booksToRead
    this.thisMonthBook = this.nextMonthBook;
    const newbook = Math.floor(Math.random() * this.booksToRead.length);
    this.nextMonthBook = this.booksToRead[newbook];
    this.booksToRead.splice(newbook, 1);
    this.nextMonthBook.month = (month + 1) % 12;
    // write out booksToRead and thisMonthBook
    this.write('booksToRead', this.booksToRead);
    this.write('thisMonthBook', this.thisMonthBook);
    this.write('nextMonthBook', this.nextMonthBook);
    // say book and cvhange TOPIC
    client.say(
      channel,
      `This months book is ${this.thisMonthBook.title} by ${this.thisMonthBook
        .author} suggested by ${this.thisMonthBook.suggested}, ${this.thisMonthBook.link}`,
    );
    client.say(
      channel,
      `Next months book is ${this.nextMonthBook.title} by ${this.nextMonthBook
        .author} suggested by ${this.nextMonthBook.suggested}, ${this.nextMonthBook.link}`,
    );
  }

  setTopic(client, channel, topic) {
    this.client = client;
    // ignore if not configured to set topic
    if (_.isUndefined(config.setTopic) || !config.setTopic) {
      return false;
    }
    // construct new topic
    let newTopic = topic;
    if (!_.isUndefined(config.topicBase)) {
      newTopic = `${topic} ${config.topicBase}`;
    }
    // set it
    client.send('TOPIC', channel, newTopic);
  }

  write(fileName, file) {
    fs
      .outputJson(`plugin_code/bookclub/config/${fileName}.json`, file)
      .then(console.log(`writing to ${fileName}`))
      .catch(console.error);
    return this;
  }

  showBooks(client, { nick }) {
    this.client = client;
    this.booksToRead.forEach(({ title, author, suggested, link }, i) => {
      client.say(nick, ` [${i}] ${title} by ${author} suggested by ${suggested}, ${link}`);
    });
  }

  showRead(client, { nick }) {
    this.client = client;
    this.booksRead.forEach(book => {
      let month = 'No Month';
      switch (book.month) {
        case 0:
          month = 'January';
          break;
        case 1:
          month = 'Febuary';
          break;
        case 2:
          month = 'March';
          break;
        case 3:
          month = 'April';
          break;
        case 4:
          month = 'May';
          break;
        case 5:
          month = 'June';
          break;
        case 6:
          month = 'July';
          break;
        case 7:
          month = 'August';
          break;
        case 8:
          month = 'September';
          break;
        case 9:
          month = 'October';
          break;
        case 10:
          month = 'November';
          break;
        case 11:
          month = 'December';
          break;
        default:
          month = 'Month not found';
          break;
      }
      client.say(
        nick,
        `${month}: ${book.title} by ${book.author} suggested by ${book.suggested}, ${book.link}`,
      );
    });
  }

  vote(client, message, cmdArgs) {
    const args = cmdArgs.split(' ', 1);
    this.client = client;
    if (args[0] === '') {
      client.say(message.args[0], `Keep: ${this.keep} Against: ${this.new}`);
    } else {
      if (_.includes(this.voted, message.nick.toLowerCase())) {
        client.say(message.args[0], `${message.nick} you've arlready voted`);
        return false;
      }
      if (args[0].toLowerCase() === 'keep') {
        this.keep += 1;
        this.voted.push(message.nick.toLowerCase());
        client.say(message.args[0], `Keep: ${this.keep} Against: ${this.new}`);
      } else if (args[0].toLowerCase() === 'new') {
        if (this.new === 2) {
          this.startTimeout = setTimeout(this.startTimeoutFunction, 10 * 60 * 1000);
        }
        this.new += 1;
        this.voted.push(message.nick.toLowerCase());
        if (this.new === 6 && this.keep === 0) {
          const month = this.date.getMonth();
          this.changeBook(this.client, month, message.args[0]); // NOTE: need to fix change book
          this.keep = 0;
          this.new = 0;
          this.voted = [];
          clearTimeout(this.startTimeout);
          return true;
        }
        client.say(message.args[0], `Keep: ${this.keep} Against: ${this.new}`);
      } else {
        client.say(message.args[0], `${args[0]} is not a valid input`);
      }
    }
  }

  startTimeoutFunction() {
    clearTimeout(this.startTimeout);
    if (this.client !== null) {
      if (this.new > this.keep) {
        const month = this.date.getMonth() - 1;
        this.changeBook(this.client, month, this.config.channels[0]);
      } else {
        this.client.say(this.config.channels[0], "You've voted to keep this months book");
      }
      this.keep = 0;
      this.new = 0;
      this.voted = [];
    }
  }
}

export default Bookclub;
