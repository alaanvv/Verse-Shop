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
  if (!product.stock) return interaction.reply({ content: 'No more stock for this', ephemeral: true })

  // Get one from stock
  const productStock = await ProductStock.findOne({ productId: product._id })
  await ProductStock.deleteOne({ productId: product._id, content: productStock.content })
  const cartData = await Cart.findOneAndUpdate({ userId: interaction.user.id }, {
    $push: {
      products: {
        messageId: interaction.message.id,
        id: product._id,
        name: product.name,
        content: productStock.content,
        price: product.price,
        dateAdded: productStock.dateAdded
      }
    },
  }, { returnDocument: 'after' })

  // Update database
  const updatedProduct = await Product.findOneAndUpdate({ _id: product._id }, { stock: product.stock - 1 }, { returnDocument: 'after' })

  // Update messages
  interaction.deferUpdate()
  const cartMessage = await interaction.channel.messages.fetch(cartData.messageId)
  cartMessage.edit({ embeds: [generateEmbedCart(bot, cartData.products, interaction)] })

  const equalProductsInCart = cartData.products.filter(product => product.messageId === interaction.message.id)
  interaction.message.edit({ embeds: [bot.generateEmbed('product_cart', { name: equalProductsInCart[0].name, amount: equalProductsInCart.length })] })

  bot.updateProductMessage(interaction.guild, updatedProduct)
}