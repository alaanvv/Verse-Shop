const { Product, ProductMessage, ProductStock } = require('../database')

module.exports = {
  name: 'p',

  run: async (bot, message) => {
    // Get all products and place them on a dropdown menu, then wait for a selection
    const products = await Product.find({})
    if (!products.length) return message.channel.send('No products here')

    const options = products.map(product => ({ label: product.name, value: String(product._id) }))
    const selectMenu = bot.createSelectMenu({ id: 'products', placeholder: 'Choose an product to place here', options })
    const menuRow = bot.createActionRow(selectMenu)

    const selectMessage = await message.channel.send({ components: [menuRow] })
    const interaction = await message.channel.awaitMessageComponent({ filter: i => i.customId === 'products', componentType: 'SELECT_MENU', max: 1, idle: 60e3 })

    // Get selected product
    const selectedProduct = products.find(product => product._id == interaction.values[0])
    const filterProduct = { productId: selectedProduct._id }
    selectedProduct.stock = await ProductStock.countDocuments(filterProduct)

    // Check if display already exists somewehere, if it exists, remove it
    const productMessageSearchFilter = { productId: selectedProduct._id }
    const productMessage = await ProductMessage.findOne(productMessageSearchFilter)

    if (productMessage) await productMessage.deleteOne(productMessageSearchFilter)

    // Creates a display for the product
    const buyButton = bot.createButton({ id: `start_purchase__${selectedProduct._id}`, style: 'success', label: 'Buy product', emoji: bot.emoji.buy })
    const row = bot.createActionRow(buyButton)
    const displayEmbed = bot.generateEmbed('display', selectedProduct)

    const ProductMessageFinal = await message.channel.send({ components: [row], embeds: [displayEmbed] })

    // Saves display to database
    await ProductMessage.create({ channelId: message.channelId, messageId: ProductMessageFinal.id, productId: selectedProduct._id })

    // End interaction
    interaction.deferUpdate()
    selectMessage.delete()
  }
}