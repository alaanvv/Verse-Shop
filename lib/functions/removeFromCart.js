const { Product, ProductStock, Cart } = require('../database')
const generateEmbedCart = require('./generateEmbedCart')

module.exports = async (bot, interaction) => {
  // Check if cart belongs to user
  const cartTopic = await interaction.guild.members.fetch(interaction.channel.topic)
  if (cartTopic.id !== interaction.member.id) return interaction.deferUpdate()

  // Get and validate product
  const productId = Number(interaction.customId.split('__')[1])
  const product = await Product.findOne({ _id: productId })
  if (!product) return interaction.reply('There\'s an error with this product')
  
  // Take one from cart
  let cartData = await Cart.findOne({ userId: interaction.user.id })
  const productStock = cartData.products.find(cartProduct => cartProduct.id === product._id)

  if (!productStock) {
    interaction.message.delete()
    return interaction.reply({ content: 'This wasn\'t supposed to be here', ephemeral: true })
  }
  cartData = await Cart.findOneAndUpdate({ userId: interaction.user.id }, {
    $pull: {
      products: {
        messageId: interaction.message.id,
        id: product._id,
        name: product.name,
        price: product.price,
        content: productStock.content,
        dateAdded: productStock.dateAdded
      }
    }
  }, { returnDocument: 'after' })

  // Add to stock
  await ProductStock.create({ productId: product._id, content: productStock.content, dateAdded: productStock.dateAdded })
  const stock = await ProductStock.countDocuments({ productId: product._id })
  const updatedProduct = await Product.findOneAndUpdate({ _id: product._id }, { stock }, { returnDocument: 'after' })

  // Update messages
  interaction.deferUpdate()
  const cartMessage = await interaction.channel.messages.fetch(cartData.messageId)
  cartMessage.edit({ embeds: [generateEmbedCart(bot, cartData.products, interaction)] })

  const equalProductsInCart = cartData.products.filter(product => product.messageId === interaction.message.id)
  if (equalProductsInCart.length) interaction.message.edit({ embeds: [bot.generateEmbed('product_cart', { name: product.name, amount: equalProductsInCart.length })] })
  else {
    if ((await Cart.findOne({ userId: interaction.user.id })).products.length) interaction.message.delete()
    else {
      Cart.deleteMany({ userId: interaction.user.id })
      interaction.channel.delete()
    }
  }
  bot.updateProductMessage(interaction.guild, updatedProduct)
}