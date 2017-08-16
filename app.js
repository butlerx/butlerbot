#!/usr/bin/env node
/**
 * Creabot
 * main application script
 * @author creadak <creadak@gmail.com>
 * @version 1.1.0
 */
require('@std/esm');
const bot = require('./app/bot');
const plug = require('./plugins');

console.log('butlerbot');
// Set node env
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

bot.init();
// load plugins
plug(bot);
