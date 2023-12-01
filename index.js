const { Client } = require('discord.js')
const setup = require('./lib/setup.js')

const bot = new Client({ intents: 3276799, partials: ['CHANNEL', 'USER', 'MESSAGE'] })
setup(bot)

bot.login(bot.token)