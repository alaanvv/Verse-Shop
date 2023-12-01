const generateEmbedCartDetails = require('./generateEmbedCart')
const { Cart } = require('../database')

module.exports = async (bot, categoriaCart, interaction) => {
  const cartChannel = await interaction.guild.channels.create(`🛒︱${interaction.user.tag}`, {
    parent: categoriaCart.id,
    topic: interaction.user.id,
    permissionOverwrites: [{ id: interaction.guildId, deny: ['VIEW_CHANNEL'] }, { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }]
  })

  const finishButton = bot.createButton({ id: 'finish_purchase', label: 'Finish' })
  const cancelButton = bot.createButton({ id: 'cancel_purchase', style: 'danger', label: 'Cancel' })
  const row = bot.createActionRow(finishButton, cancelButton)
  const cartMessage = await cartChannel.send({ embeds: [generateEmbedCartDetails(bot, null, interaction)], components: [row] })

  await Cart.create({ userId: interaction.user.id, messageId: cartMessage.id, products: [] })
  return cartChannel
}