const { MessageButton, MessageActionRow, TextInputComponent, MessageSelectMenu, Modal } = require('discord.js')
const { ProductMessage } = require('./database')

module.exports = bot => {
  bot.createButton = ({ id, style = 'primary', label = '', emoji = '', disabled = false }) => {
    style = style.toUpperCase()

    return new MessageButton()
      .setCustomId(id)
      .setStyle(style)
      .setLabel(label)
      .setEmoji(emoji)
      .setDisabled(disabled)
  }

  bot.createInput = ({ id, style = 'short', label = '', placeholder = '', value = '', required = 0, maxLenght = 50 }) => {
    style = style.toUpperCase()

    return new TextInputComponent()
      .setCustomId(id)
      .setStyle(style)
      .setLabel(label)
      .setPlaceholder(placeholder)
      .setValue(value)
      .setRequired(required)
      .setMaxLength(maxLenght)
  }

  bot.createSelectMenu = ({ id, placeholder = '', options = [] }) => {
    return new MessageSelectMenu()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .addOptions(options)
  }

  bot.createActionRow = (...components) => {
    return new MessageActionRow()
      .addComponents(...components)
  }

  bot.createModal = ({ id, title }) => {
    const modal = new Modal
    modal.setCustomId(id)
    modal.setTitle(title)

    return modal
  }

  bot.filterUser = id => {
    return i => i.user.id === id
  }

  bot.generateEmbed = (type, data) => {
    const embed = { color: bot.color, image: { url: bot.banner } }

    switch (type) {
      // Make new and display one
      case 'new':
        embed.author = { name: `${bot.emoji.verified} ${'Product created'}` }
        embed.description = `- ${bot.emoji.name} **${'Name'}** | __${data.name}__\n- ${bot.emoji.price} **${'Price'}** | __${bot.formatPrice(data.price, true)}__\n- ${bot.emoji.stock} **${'Stock'}** | __0__`
        break

      case 'display':
        embed.author = { name: 'Product' }
        embed.description = `- ${bot.emoji.name} **${'Name'}** | __${data.name}__\n- ${bot.emoji.price} **${'Price'}** | __${bot.formatPrice(data.price, true)}__\n- ${bot.emoji.stock} **${'Stock'}** | __${data.stock}__`
        break

      case 'edit':
        embed.author = 'Product Editor'
        embed.description = `- **${'Name'}**: \`${data.name != undefined ? data.name : '-'}\`\n- **${'Price'}**: \`${data.price != undefined ? bot.formatPrice(data.price, true) : '-'}\`\n- **${'Stock'}**: \`${data.stock != undefined ? data.stock : '-'}\``
        break

      case 'edit_stock':
        embed.author = { name: data.name }
        embed.description = `\`${data.content}\``
        embed.footer = { text: `${'Added at'} ${new Date(data.dateAdded).toUTCString()} | ${data.position}/${data.total}` }
        break

      case 'start':
        embed.color = bot.color
        embed.description = 'Press the button to start'
        break

      case 'cart':
        embed.author = { name: `Your total:  R$${data.total}`, iconURL: data.icon }
        embed.fields = []
        if (data.products) data.products.forEach(product => embed.fields.push({ name: `${product.name} x${data.count[product.name]}`, value: `**Price:** __${product.price}__${data.count[product.name] > 1 ? ` | **Total:** __${product.price * data.count[product.name]}__` : ''}` }))
        break

      case 'product_cart':
        embed.title = `**Amount:** ${data.amount}`
        embed.description = `\`\`\`${data.name}\`\`\``
        embed.image = {}
        break

      case 'qr_code':
        embed.description = `**✅ Payment with PIX: ${formatPrice(data.price)}`
        embed.image = { url: 'attachment://qrcode.png' }
        break

      case 'payment_log':
        embed.title = 'New payment'
        embed.description = `**Price**: ${formatPrice(data.price)}\n **Products**: ${data.productNames}\n **Total amount**: ${data.amount}\n **Customer**: ${data.user.tag} (${data.user.id})\n **Status**: ${data.status || 'Pending'}`
        embed.fields = { label: 'ID', value: paymentId }
        embed.color = '#FF0031'
        break
    }

    return embed
  }

  bot.formatPrice = (price, show_currency = true) => {
    return `${show_currency ? 'R$' : ''}${Number(price).toFixed(2).replace(',', '.')}`
  }

  bot.delay = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  bot.updateProductMessage = async (guild, product) => {
    const productMessageData = await ProductMessage.findOne({ productId: product._id })
    const channel = guild.channels.cache.get(productMessageData?.channelId)
    if (!channel) return

    const productMessage = await channel.messages.fetch(productMessageData.messageId)
    await productMessage.edit({ embeds: [bot.generateEmbed('display', product)] })
  }

  bot.deleteCachedMessage = async (message) => {
    const msg = await message.channel.messages.fetch(message.id)
    msg.delete()
  }
}