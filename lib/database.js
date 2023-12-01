const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

// Connect
mongoose.set('strictQuery', true)
mongoose.connect(process.env.mongoKey)

// Models
const ProductSchema = new mongoose.Schema({
  _id: Number,
  name: String,
  price: Number,
  stock: { type: Number, default: 0 }
}, { _id: false })
ProductSchema.plugin(AutoIncrement)

const ProductStockSchema = new mongoose.Schema({
  productId: Number,
  content: String,
  dateAdded: Number
})

const ProductMessageSchema = new mongoose.Schema({
  channelId: String,
  messageId: String,
  productId: Number
})

const CartSchema = new mongoose.Schema({
  userId: String,
  messageId: String,
  products: [
    {
      id: Number,
      name: String,
      price: Number,
      content: String,
      dateAdded: Number,
      messageId: String
    }
  ]
})

const SoldProductSchema = new mongoose.Schema({
  id: Number,
  name: String,
  amount: Number,
  date: Number
})

const PaymentSchema = new mongoose.Schema({
  _id: Number,
  userId: String,
  price: Number,
  confirmed: Boolean,
  soldStock: Number,
  date: String
})

module.exports = {
  Product: mongoose.model('product', ProductSchema),
  ProductStock: mongoose.model('product_stock', ProductStockSchema),
  ProductMessage: mongoose.model('product_message', ProductMessageSchema),
  Cart: mongoose.model('cart', CartSchema),
  SoldProduct: mongoose.model('sold_product', SoldProductSchema),
  Payment: mongoose.model('payment', PaymentSchema)
}
