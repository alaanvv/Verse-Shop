module.exports = async (bot, message) => {
  if (message.author === bot.user && !message.embeds.length && !message.components.length) return setTimeout(e => bot.deleteCachedMessage(message), bot.deleteMessageDelay)
  if (!message.guild || message.author.bot || !message.content.startsWith(bot.prefix) || !message.member.permissions.has('ADMINISTRATOR')) return

  const args = message.content.slice(bot.prefix.length).trim().split(' ')
  const query = args.shift().toLowerCase()

  const command = bot.commands.get(query)
  if (!command) return

  command.run(bot, message, args)
  message.delete()
}