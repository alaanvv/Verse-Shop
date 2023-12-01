const { Product, ProductStock, SoldProduct } = require('../database')

module.exports = {
  name: 'e',

  run: async (bot, message) => {
    // Initialize stuff
    let stock, selectedProduct, selectedStock
    let currentStockIndex = 0

    // Get all products and place them on a dropdown menu
    const products = await Product.find({}).lean()
    if (!products.length) return message.channel.send('No products here')

    const options = products.map(product => ({ label: product.name, value: String(product._id) }))
    const selectMenu = bot.createSelectMenu({ id: 'products_select_menu', placeholder: 'Select an product to edit', options })
    const menuRow = bot.createActionRow(selectMenu)

    // Create all the buttons
    const addButton = bot.createButton({ id: 'add', style: 'success', label: 'Add stock' })
    const editButton = bot.createButton({ id: 'edit', label: 'Edit product' })
    const manageStock = bot.createButton({ id: 'manage_stock', style: 'secondary', label: 'Manage stock' })
    const buttonRow = bot.createActionRow(addButton, editButton, manageStock)

    // Send message and collect interaction
    const botMessage = await message.channel.send({ embeds: [bot.generateEmbed('edit', {})], components: [menuRow, buttonRow] })
    const collector = message.channel.createMessageComponentCollector({ filter: i => ['products_select_menu', 'add', 'edit', 'manage_stock', 'next', 'previous', 'delete'].includes(i.customId), idle: 60e3 })

    collector.on('collect', async interaction => {
      if (interaction.isSelectMenu()) {
        // Get selected product and update
        selectedProduct = products.find(product => product._id == interaction.values[0])
        selectedProduct.stock = await ProductStock.countDocuments({ productId: selectedProduct._id })

        return interaction.update({ embeds: [bot.generateEmbed('edit', selectedProduct)] })
      }

      else if (interaction.isButton()) {
        if (!selectedProduct) return interaction.reply('You have to select a product')

        switch (interaction.customId) {
          case 'edit':
            // Create modal, read and validate product data
            const modalEdit = bot.createModal({ id: 'edit_product', title: 'Editing product' })

            const nameInput = bot.createInput({ id: 'product_name', label: 'New product name', value: selectedProduct.name, required: 1 })
            const priceInput = bot.createInput({ id: 'product_price', label: 'New product price', placeholder: '00,00', value: String(selectedProduct.price), required: 1 })

            modalEdit.addComponents(bot.createActionRow(nameInput), bot.createActionRow(priceInput))

            await interaction.showModal(modalEdit)
            const modalEditInteraction = await interaction.awaitModalSubmit({ filter: bot.filterUser(message.author.id), time: 60e3 })

            const name = modalEditInteraction.fields.getTextInputValue('product_name')
            const notFormattedPrice = modalEditInteraction.fields.getTextInputValue('product_price')

            const price = bot.formatPrice(notFormattedPrice, false)
            if (!price) return modalEditInteraction.reply('Invalid price format')

            // Save new data to database and end interaction
            selectedProduct = await Product.findOneAndUpdate({ _id: selectedProduct._id }, { name, price }, { returnDocument: 'after' })
            selectedProduct.stock = await ProductStock.countDocuments({ productId: selectedProduct._id })
            if (name) await SoldProduct.updateMany({ id: selectedProduct._id }, { name })

            modalEditInteraction.deferUpdate()

            // Update messages
            interaction.message.edit({ embeds: [bot.generateEmbed('edit', selectedProduct)] })
            return await bot.updateProductMessage(message.guild, selectedProduct)

          case 'add':
            // Read product's content
            const modalAdd = bot.createModal({ id: 'add_stock', title: 'Adding stock' })

            const contentInput = bot.createInput({ id: 'product_content', style: 'paragraph', label: 'What\'s going to be sent to the buyer', required: 1 })
            modalAdd.addComponents(bot.createActionRow(contentInput))

            await interaction.showModal(modalAdd)
            const modalAddInteraction = await interaction.awaitModalSubmit({ filter: bot.filterUser(message.author.id), time: 60e3 })

            const content = modalAddInteraction.fields.getTextInputValue('product_content')
            const productFilter = { productId: selectedProduct._id }

            // Save new content to database and update stock
            await ProductStock.create({ ...productFilter, content, dateAdded: Date.now() })
            selectedProduct.stock = await ProductStock.countDocuments(productFilter)
            await Product.updateOne(productFilter, { stock: selectedProduct.stock })

            modalAddInteraction.deferUpdate()

            // Update messages
            interaction.message.edit({ embeds: [bot.generateEmbed('edit', selectedProduct)] })
            return await bot.updateProductMessage(message.guild, selectedProduct)

          case 'manage_stock':
            // Get stock
            stock = await ProductStock.find({ productId: selectedProduct._id }).lean()
            if (!stock.length) return interaction.reply('No stock')
            selectedStock = stock[currentStockIndex]

            // Create buttons
            const previousButton = bot.createButton({ id: 'previous', style: 'primary', emoji: bot.emoji.previous })
            const deleteButton = bot.createButton({ id: 'delete', style: 'danger', emoji: bot.emoji.delete })
            const nextButton = bot.createButton({ id: 'next', style: 'primary', emoji: bot.emoji.next })
            const row = bot.createActionRow(previousButton, deleteButton, nextButton)

            // Edit message and wait for interactions
            await botMessage.edit({ embeds: [bot.generateEmbed('edit_stock', { ...selectedProduct, ...selectedStock, position: currentStockIndex + 1, total: stock.length })], components: [row] })
            return interaction.deferUpdate()

          case 'previous':
            if (currentStockIndex > 0) {
              selectedStock = stock[--currentStockIndex]
              await botMessage.edit({ embeds: [bot.generateEmbed('edit_stock', { ...selectedProduct, ...selectedStock, position: currentStockIndex + 1, total: stock.length })] })
            }
            return interaction.deferUpdate()

          case 'next':
            if (currentStockIndex < stock.length - 1) {
              selectedStock = stock[++currentStockIndex]
              await botMessage.edit({ embeds: [bot.generateEmbed('edit_stock', { ...selectedProduct, ...selectedStock, position: currentStockIndex + 1, total: stock.length })] })
            }
            return interaction.deferUpdate()

          case 'delete':
            // Remove product from stock
            const removedProduct = selectedStock
            currentStockIndex = 0
            selectedStock = stock[currentStockIndex]

            stock.splice(stock.indexOf(removedProduct), 1)
            selectedProduct.stock--

            // Modificate database
            await ProductStock.deleteOne({ productId: removedProduct.productId, product_content: removedProduct.product_content })
            await Product.findOneAndUpdate({ _id: removedProduct.productId }, { stock: stock.length })

            // Exit configuration if no more stock or update message
            if (selectedProduct.stock === 0) collector.stop()
            else interaction.update({ embeds: [bot.generateEmbed('edit_stock', { ...selectedProduct, ...selectedStock, position: currentStockIndex + 1, total: stock.length })] })
            return bot.updateProductMessage(interaction.message.guild, selectedProduct)
        }
      }
    })

    collector.on('end', e => bot.deleteCachedMessage(botMessage))
  }
}