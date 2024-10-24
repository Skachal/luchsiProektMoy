const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const Product = require('./models/Product');

// Подключение к MongoDB
mongoose.connect('mongodb+srv://Muhammed:Qazak123@cluster0.fqbsrbu.mongodb.net/bloknot?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  cleanDeadCartItems(); // Запускаем функцию очистки после подключения
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Функция для очистки корзины от "мёртвых" элементов
async function cleanDeadCartItems() {
  try {
    const cartItems = await Cart.find({});  // Получаем все элементы корзины

    for (let item of cartItems) {
      // Проверяем, существует ли товар с данным itemId в коллекции Product
      const productExists = await Product.findById(item.itemId);

      if (!productExists) {
        // Если товара не существует, удаляем элемент из корзины
        console.log(`Удаляем мёртвый элемент корзины с ID товара: ${item.itemId}`);
        await Cart.deleteOne({ _id: item._id });
      }
    }

    console.log('Очистка завершена.');
    mongoose.disconnect();  // Отключаемся от MongoDB после выполнения
  } catch (error) {
    console.error('Ошибка при очистке корзины:', error);
  }
}
