const bcrypt = require('bcryptjs');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const Favorite = require('./models/Favorite');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Подключение к MongoDB
mongoose.connect('mongodb+srv://Muhammed:Qazak123@cluster0.fqbsrbu.mongodb.net/bloknot?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Настройка для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Эндпоинт регистрации
app.post('/registr', upload.single('profilePhoto'), async (req, res) => {  // Marked async correctly
  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
    }

    // Make sure the hashedPassword is called with await inside an async function
    const hashedPassword = await bcrypt.hash(password, 10);  // Hash the password
    
    const profilePhoto = req.file ? req.file.path : null;
    const newUser = new User({ firstName, lastName, email, phone, password: hashedPassword, profilePhoto });
    await newUser.save();
    
    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка во время регистрации:', error);
    res.status(500).json({ message: 'Ошибка сервера во время регистрации' });
  }
});

// Эндпоинт для входа
app.post('/login', async (req, res) => {  // Make sure it's async
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Compare the password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    res.status(200).json({ message: 'Вход выполнен успешно', user });
  } catch (error) {
    console.error('Ошибка во время входа:', error);
    res.status(500).json({ message: 'Ошибка сервера во время входа' });
  }
});
// Эндпоинт для добавления в избранное
app.post('/favorites', async (req, res) => {
  const { userId, itemId, name, description, price, weight, image } = req.body;

  // Проверяем, что все необходимые поля присутствуют и не пустые
  if (!userId || !itemId || !name || !description || !price || !weight || !image) {
    console.error('Ошибка: Все поля обязательны:', req.body);
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    // Проверка на существование элемента в избранном
    const existingFavorite = await Favorite.findOne({ userId, itemId });
    if (existingFavorite) {
      return res.status(200).json({ message: 'Элемент уже в избранном' });
    }

    const newFavorite = new Favorite({ userId, itemId, name, description, price, weight, image });
    await newFavorite.save();
    res.status(200).json({ message: 'Элемент добавлен в избранное' });
  } catch (error) {
    console.error('Ошибка при добавлении в избранное:', error);
    res.status(500).json({ message: 'Ошибка при добавлении в избранное' });
  }
});

// Эндпоинт для получения избранных элементов по userId
app.get('/favorites/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Проверяем, что передан корректный ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Некорректный идентификатор пользователя' });
    }

    const favorites = await Favorite.find({ userId: new mongoose.Types.ObjectId(userId) });
    if (!favorites || favorites.length === 0) {
      return res.status(404).json({ message: 'Избранные элементы не найдены' });
    }
    res.status(200).json(favorites);
  } catch (error) {
    console.error('Ошибка при загрузке избранных элементов:', error);
    res.status(500).json({ message: 'Ошибка при загрузке избранных элементов' });
  }
});

// Эндпоинт для удаления элемента из избранного по userId и itemId
app.delete('/favorites/:userId/:itemId', async (req, res) => {
  const { userId, itemId } = req.params;
  console.log('Попытка удаления элемента:', { userId, itemId });

  try {
    // Проверяем, что переданы корректные идентификаторы
    if (!mongoose.Types.ObjectId.isValid(userId) || !itemId) {
      return res.status(400).json({ message: 'Некорректный идентификатор' });
    }

    // Удаляем элемент из избранного
    const favorite = await Favorite.findOneAndDelete({ userId, itemId: itemId.toString() });
    
    if (!favorite) {
      return res.status(404).json({ message: 'Элемент не найден в избранном' });
    }

    res.status(200).json({ message: 'Элемент успешно удален из избранного' });
  } catch (error) {
    console.error('Ошибка при удалении из избранного:', error);
    res.status(500).json({ message: 'Ошибка при удалении из избранного' });
  }
});


app.post('/cart', async (req, res) => {
  const { userId, itemId, name, description, price, weight, image, quantity } = req.body;

  if (!userId || !itemId || !name || !description || !price || !weight || !image || !quantity) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    const existingCartItem = await Cart.findOne({ userId, itemId });
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await existingCartItem.save();
      return res.status(200).json({ message: 'Количество товара увеличено' });
    }

    const newCartItem = new Cart({ userId, itemId, name, description, price, weight, image, quantity });
    await newCartItem.save();
    res.status(200).json({ message: 'Товар добавлен в корзину' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при добавлении в корзину', error });
  }
});


app.get('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const cartItems = await Cart.find({ userId });
    if (!cartItems.length) {
      return res.status(404).json({ message: 'Корзина пуста' });
    }
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Ошибка при получении корзины:', error);
    res.status(500).json({ message: 'Ошибка при получении корзины' });
  }
});
app.patch('/cart/:userId/:itemId', async (req, res) => {
  const { userId, itemId } = req.params;
  const { quantity } = req.body;

  if (quantity <= 0) {
    return res.status(400).json({ message: 'Количество товара должно быть больше нуля' });
  }

  try {
    const updatedItem = await Cart.findOneAndUpdate(
      { userId, itemId },
      { $set: { quantity } },
      { new: true }  // Возвращает обновленный документ
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Элемент не найден в корзине' });
    }

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении товара в корзине', error });
  }
});

app.delete('/cart/:userId/:itemId', async (req, res) => {
  const { userId, itemId } = req.params;

  try {
    const cartItem = await Cart.findOneAndDelete({ userId, itemId });

    if (!cartItem) {
      return res.status(404).json({ message: 'Элемент не найден в корзине' });
    }

    res.status(200).json({ message: 'Элемент успешно удален из корзины' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении из корзины', error });
  }
});


// Эндпоинт для создания заказа
app.post('/orders', async (req, res) => {
  console.log('Создание заказа:', req.body);

  const { userId, items, totalAmount } = req.body;

  if (!userId || !items || !totalAmount) {
    return res.status(400).json({ message: 'Все поля обязательны для создания заказа' });
  }

  try {
    const newOrder = new Order({ userId, items, totalAmount });
    await newOrder.save();
    console.log('Заказ успешно сохранен:', newOrder);
    res.status(201).json({ message: 'Заказ успешно создан', order: newOrder });
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании заказа' });
  }
  
});

app.get('/orders/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId });
    if (!orders.length) {
      return res.status(404).json({ message: 'Заказы не найдены' });
    }
    res.status(200).json(orders);
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});
// Маршрут для загрузки изображения
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.json({ filePath: req.file.filename });
});

// Маршрут для обновления данных пользователя
app.post('/updateUser', async (req, res) => {
  const { firstName, lastName, email, phoneNumber, profilePhoto } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { firstName, lastName, phoneNumber, profilePhoto },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error updating user information' });
  }
});





app.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});



// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

app.post('/api/favorites', async (req, res) => {
  const { userId, itemId } = req.body;

  try {
    // Найти пользователя по ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Проверить, есть ли элемент в избранных
    if (!user.favorites.includes(itemId)) {
      user.favorites.push(itemId);
      await user.save();
    }

    res.status(200).json({ message: 'Item added to favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to favorites', error });
  }
});
