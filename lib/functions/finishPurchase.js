const { Payment, Cart, SoldProduct } = require('../database')
const { MessageAttachment } = require('discord.js')
const mercadoPago = require('mercadopago')
const { Buffer } = require('buffer')

if (process.env.MercadoPagoAccessToken) 
	mercadoPago.configure({ access_token: process.env.MercadoPagoAccessToken })
else console.log('No access token for Mercado Pago')

module.exports = async (bot, interaction) => {
	const logsChannelCompras = interaction.guild.channels.cache.get(process.env.logsChannel)
	const cartData = await Cart.findOne({ userId: interaction.user.id })

	const amount = cartData.products.length
	if (!amount) return interaction.deferUpdate()

	const price = cartData.products.reduce((acc, curr) => acc + curr.price)
	const productNames = [...new Set(cartData.products.map(product => product.name))].join(' | ')
	const productsContent = cartData.products.map((product, i) => `${i + 1} ${product.content}`)

	// Edit cart message
	const waitButton = bot.createButton({ id: 'waiting_payment', label: 'Waiting payment', emoji: bot.emoji.wait, disabled: true })
	const paymentWaitRow = bot.createActionRow(waitButton)
	await interaction.update({ components: [paymentWaitRow] })

	// Delete product messsages
	const productMessageIds = cartData.products.map(product => product.messageId)
	const productMessages = (await interaction.channel.messages.fetch()).filter(message => productMessageIds.includes(message.id))
	interaction.channel.bulkDelete(productMessages)

	// Send payment embed
	const paymentData = await mercadoPago.payment.create({
		transaction_stock: price,
		description: productNames,
		payment_method_id: 'pix',
		payer: { email: 'no-email@idk.com', first_name: `${interaction.user.tag} (${interaction.user.id})` }
	})

	const qrCodeInBase64 = paymentData.body.point_of_interaction.transaction_data.qr_code_base64
	const qrCode = Buffer.from(qrCodeInBase64, 'base64')
	const qrCodeImage = new MessageAttachment(qrCode, 'qrcode.png')
	const embedQr = bot.generateEmbed('qr_code', { price })

	const buttonCopyPaste = bot.createButton({ id: 'copy_paste', label: 'PIX Copy Paste' })
	const rowCopyPaste = bot.createActionRow(buttonCopyPaste)

	interaction.followUp({ embeds: [embedQr], files: [qrCodeImage], fetchReply: true, components: [rowCopyPaste] })

	// Handle copy paste
	const copyPasteCollector = interaction.channel.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id && i.customId === 'copy_paste', time: 600e3 })
	copyPasteCollector.on('collect', async i => {
		interaction.channel.send({ content: paymentData.body.point_of_interaction.transaction_data.qr_code })
		rowCopyPaste.components[0].setDisabled(true)
		i.update({ components: [rowCopyPaste] })
	})

	// Send log
	const paymentLogEmbed = bot.generateEmbed('payment_log', { price, productNames, amount, paymentId: paymentData.body.id, user: interaction.user })
	logsChannelCompras.send({ embeds: [paymentLogEmbed] })

	// Create payment in database
	await Payment.create({ _id: Number(paymentData.body.id), userId: interaction.user.id, confirmed: false })

	// Wait for payment (5 min)
	for (let attempts = 0; attempts < 8; attempts++) {
		bot.delay(30e3)

		const paymentResponse = await mercadoPago.payment.get(paymentData.body.id)
		const paymentStatus = paymentResponse.body.status

		if (paymentStatus !== 'approved') return

		// Update embed
		const approvedButton = bot.createButton({ id: 'payment_approved', label: 'Payment approved', emoji: bot.emoji.verified })
		const approvedRow = bot.createActionRow(approvedButton)
		interaction.message.edit({ components: [approvedRow] })

		// Send log
		const embed = bot.generateEmbed('payment_log', { price, productNames, amount, paymentId: paymentData.body.id, user: interaction.user, status: 'Approved' })
		logsChannelCompras.send({ embeds: [embed] })

		// Update database
		await Payment.updateOne({ _id: Number(paymentData.body.id) }, { confirmed: true, date: paymentResponse.body.date_approved, amount, price })

		// Add sold products to database
		const soldProductsStocks = {}
		for (const product of cartData.products) {
			if (!soldProductsStocks[product.id]) soldProductsStocks.push(product)
			else soldProductsStocks[product.id] = [product]
		}

		for (const [id, products] of soldProductsStocks)
			await SoldProduct.insertMany(products.map(productStock => ({ amount: products.length, date: new Date(paymentResponse.body.date_approved).getTime(), id, name: productStock.name })))

		await interaction.channel.send(`\`${productsContent.join('\n')}\``)

		Cart.deleteOne({ userId: interaction.member.id })
		return interaction.channel.setTopic(`Disabled ${interaction.user.tag}`)
	}

	interaction.channel.send('Failed for timeout, try again')
}
