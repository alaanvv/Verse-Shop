const { Product, ProductStock, Cart } = require('../database')

module.exports = async (bot, interaction) => {
  const cartData = await Cart.findOne({ messageId: interaction.message.id })
  if (!cartData.products.length) return interaction.deferUpdate()

  const productStocks = {}
  for (const product of cartData.products) {
    if (productStocks[product.id]) productStocks[product.id].push(product)
    else productStocks[product.id] = [product]
  }

  for (const [id, productStock] of Object.entries(productStocks)) {
    await ProductStock.insertMany(productStock.map(productStock => ({ productId: productStock.id, content: productStock.content, dateAdded: productStock.dateAdded })))
    
    const productToUpdate = Product.find({ _id: id })
    productToUpdate.stock = await ProductStock.countDocuments({ productId: id })

    bot.updateProductMessage(interaction.guild, productToUpdate)
  }

  await Cart.deleteOne({ userId: interaction.user.id })
  interaction.channel.delete()
  interaction.deferUpdate()
}