const { Product, ProductStock, Cart } = require('../database')
const createCart = require('./createCart')
const generateEmbedCart = require('./generateEmbedCart')

module.exports = async (bot, interaction) => {
  const cartCategory = interaction.guild.channels.cache.get(process.env.cartCategory)
  if (!cartCategory) return interaction.reply('Cart channel not found')

  // Find product and check for stock
  const products = await Product.find({})
  const product = products.find(obj => obj._id == interaction.customId.split('__')[1])
  if (!product) return interaction.reply({ content: 'There\'s an error with this product', ephemeral: true })

  const productStock = await ProductStock.findOne({ productId: product._id })
  if (!productStock) return interaction.reply({ content: 'No stock for this', ephemeral: true })

  // Find or create cart
  const cartChannel = cartCategory.children.find(cart => cart.topic === interaction.user.id) || await createCart(bot, cartCategory, interaction)

  // Get cart on database and check if product is there
  const cartFilter = { userId: interaction.user.id }
  if (await Cart.findOne({ ...cartFilter, 'products.id': { $eq: product._id } }))
    return interaction.reply({ content: 'Product already on the cart', ephemeral: true })

  // Create a message for the cart channel
  const addButton = bot.createButton({ id: `add_to_cart__${product._id}`, label: 'Add' })
  const removeButton = bot.createButton({ id: `remove_from_cart__${product._id}`, style: 'danger', label: 'Remove' })
  const row = bot.createActionRow(addButton, removeButton)

  const cartProductMessage = await cartChannel.send({ embeds: [bot.generateEmbed('product_cart', { name: product.name, amount: 1 })], components: [row] })

  // Update database
  let cartData = await Cart.findOneAndUpdate(cartFilter, {
    $push: {
      products: [{
        id: product._id,
        name: product.name,
        price: product.price,
        content: productStock.content,
        dateAdded: productStock.dateAdded,
        messageId: cartProductMessage.id,
      }]
    }
  }, { returnDocument: 'after' })
  await ProductStock.deleteOne({ productId: product._id, content: productStock.content })
  const stock = await ProductStock.countDocuments({ productId: product._id })
  const updatedProduct = await Product.findOneAndUpdate({ _id: product._id, }, { stock }, { returnDocument: 'after' })

  // Update Messages
  bot.updateProductMessage(interaction.guild, updatedProduct)

  const cartMessage = await cartChannel.messages.fetch(cartData.messageId)
  await cartMessage.edit({ embeds: [generateEmbedCart(bot, cartData.products, interaction)] })

  interaction.deferUpdate()
}