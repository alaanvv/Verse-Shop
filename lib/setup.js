const { Collection } = require('discord.js')
const { readdirSync } = require('fs')
require('dotenv').config()
require('colors')

module.exports = bot => {
  bot.commands = new Collection()
  bot.prefix = process.env.prefix
  bot.token = process.env.token
  bot.deleteMessageDelay = process.env.messageDeleteDelay
  bot.banner = 'https://github.com/alaanvv/Image-Database/blob/main/Verse-Shop/banner.png?raw=true'
  bot.color = '#505267'

  bot.emoji = {
    verified: '✅',
    new: '➕',
    name: ':white_small_square:',
    price: '💸',
    stock: '📦',
    previous: '◀',
    next: '▶',
    delete: '✖',
    buy: '🛒',
    wait: '⏳'
  }

  // Load commands and events
  readdirSync(`${process.cwd()}/lib/commands`).forEach(file => {
    const command = require(`${process.cwd()}/lib/commands/${file}`)
    bot.commands.set(command.name, command)
    if (command.aliases) command.aliases.forEach(alias => bot.aliases.set(alias, command.name))
  })

  readdirSync(`${process.cwd()}/lib/events`).forEach(file => {
    bot.on(file.slice(0, -3), (...args) => { require(`${process.cwd()}/lib/events/${file}`)(bot, ...args) })
  })

  require('./database')
  require('./error')
  require('./utils')(bot)

  bot.once('ready', async () => console.log(`Bot running as ${bot.user.tag}`))
}
