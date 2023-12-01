const { Product } = require('../database')

module.exports = {
  name: 'n',

  run: async (bot, message) => {
    // Send message and wait for interaction
    const embedStart = bot.generateEmbed('start')
    const row = bot.createActionRow(bot.createButton({ id: 'new', emoji: bot.emoji.new }))
    const messageStart = await message.channel.send({ embeds: [embedStart], components: [row] })

    const interaction = await message.channel.awaitMessageComponent({ filter: bot.filterUser(message.author.id), time: 60e3 })
    messageStart.delete()

    // Creates, and show the form, then waits for submit
    const modal = bot.createModal({ id: 'new_product', title: 'New Product' })

    const nameInput = bot.createInput({ id: 'name', label: 'Product name:', required: 1 })
    const priceInput = bot.createInput({ id: 'price', label: 'Product price:', placeholder: '00,00', required: 1 })

    modal.addComponents(bot.createActionRow(nameInput), bot.createActionRow(priceInput))
    interaction.showModal(modal)

    const modalInteraction = await interaction.awaitModalSubmit({ filter: bot.filterUser(message.author.id), time: 60e3 })

    // Save the product to database
    const name = modalInteraction.fields.getTextInputValue('name')
    const price = Number(modalInteraction.fields.getTextInputValue('price').replace(',', '.').replaceAll(/[^\d\.]+/g, ''))

    await Product.create({ name, price })

    // Send a preview
    const embedPreview = bot.generateEmbed('new', { name, price })
    modalInteraction.reply({ embeds: [embedPreview] })
  }
}