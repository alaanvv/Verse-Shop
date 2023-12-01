const { startPurchase, cancelPurchase, finishPurchase, addToCart, removeFromCart } = require('../functions')

module.exports = async (bot, interaction) => {
  if (!interaction.isButton()) return

  switch (interaction.customId.split('__')[0]) {
    case 'start_purchase': return startPurchase(bot, interaction)
    case 'finish_purchase': return finishPurchase(bot, interaction)
    case 'cancel_purchase': return cancelPurchase(bot, interaction)
    case 'add_to_cart': return addToCart(bot, interaction)
    case 'remove_from_cart': return removeFromCart(bot, interaction)
  }
}