module.exports = (bot, products, interaction) => {
  let total = 0
  let count = {}
  
  if (products) {
    products = products.map(product => ({ name: product.name, price: product.price }))

    products.forEach(product => count[product.name] = ++count[product.name] || 1)
    products.forEach(product => total += product.price)
    products = [...new Set(products.map(JSON.stringify))].map(JSON.parse)
  }

  return bot.generateEmbed('cart', { icon: interaction.member.displayAvatarURL({ dynamic: true }), products: products, total, count })
}