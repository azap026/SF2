import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './database.js';

dotenv.config();



const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('.'));

// Простой тест endpoint без БД
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend сервер работает', 
    timestamp: new Date().toISOString() 
  });
});

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${req.ip}`);
  next();
});

console.log('🔧 Настроена расширенная CORS политика');

// Функция для инициализации таблиц
async function initializeTables() {
  try {
    // Создание таблицы пользователей для авторизации
    await query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание таблицы сессий/токенов
    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES auth_users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание индексов для производительности
    await query(`
      CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
    `);

    // Создание таблицы пользователей (старая таблица для совместимости)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание таблицы заказов
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        tracking_no BIGINT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        status INTEGER DEFAULT 0,
        amount DECIMAL(10,2) NOT NULL,
        user_id INTEGER REFERENCES auth_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создание таблицы статистики
    await query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(255) NOT NULL,
        metric_value INTEGER NOT NULL,
        percentage DECIMAL(5,2),
        extra_value INTEGER,
        is_loss BOOLEAN DEFAULT FALSE,
        color VARCHAR(50) DEFAULT 'primary',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);



    console.log('✅ Таблицы авторизации созданы/проверены');

    // Вставка демонстрационных данных если таблицы пустые
    const userCount = await query('SELECT COUNT(*) FROM auth_users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await insertDemoAuthData();
    }

    const orderCount = await query('SELECT COUNT(*) FROM orders');
    if (parseInt(orderCount.rows[0].count) === 0) {
      await insertDemoData();
    }



  } catch (error) {
    console.error('❌ Ошибка при инициализации таблиц (БД недоступна):', error.message);
    console.log('⚠️ Работаем без базы данных - используем локальное хранилище');
  }
}

// Функция для вставки демонстрационных данных авторизации
async function insertDemoAuthData() {
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
    const hashedPassword = await bcrypt.hash('password123', salt);

    await query(`
      INSERT INTO auth_users (email, password_hash, firstname, lastname, company, is_active, email_verified)
      VALUES 
        ('admin@mantis.ru', $1, 'Админ', 'Система', 'Mantis Admin', true, true),
        ('user@mantis.ru', $2, 'Иван', 'Иванов', 'ОО Иванов и К°', true, true),
        ('demo@mantis.ru', $3, 'Демо', 'Пользователь', 'Демо Компания', true, false)
    `, [hashedPassword, hashedPassword, hashedPassword]);

    console.log('✅ Демонстрационные данные авторизации вставлены');
    console.log('🔑 Тестовые аккаунты:');
    console.log('   admin@mantis.ru / password123');
    console.log('   user@mantis.ru / password123');
    console.log('   demo@mantis.ru / password123');
    
  } catch (error) {
    console.error('❌ Ошибка при вставке демо-данных авторизации:', error);
  }
}

// Функция для вставки демонстрационных данных
async function insertDemoData() {
  try {
    // Данные пользователей
    await query(`
      INSERT INTO users (name, email) VALUES
      ('Иван Иванов', 'ivan@example.com'),
      ('Мария Петрова', 'maria@example.com'),
      ('Алексей Сидоров', 'alexey@example.com');
    `);

    // Данные заказов
    await query(`
      INSERT INTO orders (tracking_no, product_name, quantity, status, amount) VALUES
      (84564564, 'Объектив камеры', 40, 2, 40570.00),
      (98764564, 'Ноутбук', 300, 0, 180139.00),
      (98756325, 'Мобильный телефон', 355, 1, 90989.00),
      (98652366, 'Телефон', 50, 1, 10239.00),
      (13286564, 'Компьютерные аксессуары', 100, 1, 83348.00),
      (86739658, 'Телевизор', 99, 0, 410780.00),
      (13256498, 'Клавиатура', 125, 2, 70999.00),
      (98753263, 'Мышь', 89, 2, 10570.00);
    `);

    // Данные статистики
    await query(`
      INSERT INTO statistics (metric_name, metric_value, percentage, extra_value, is_loss, color) VALUES
      ('Всего просмотров', 442236, 59.3, 35000, false, 'primary'),
      ('Всего пользователей', 78250, 70.5, 8900, false, 'primary'),
      ('Всего заказов', 18800, 27.4, 1943, true, 'warning'),
      ('Всего продаж', 35078, 27.4, 20395, true, 'warning');
    `);

    console.log('✅ Демонстрационные данные добавлены');
  } catch (error) {
    console.error('❌ Ошибка при добавлении демонстрационных данных:', error);
  }
}



// Локальное хранилище пользователей (fallback для тестирования без БД)
let localUsers = [];
let userIdCounter = 1;

// Функция для работы с пользователями (с fallback на локальное хранилище)
async function createUser(userData) {
  try {
    const result = await query(`
      INSERT INTO auth_users (email, password_hash, firstname, lastname, company, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, true, false)
      RETURNING id, email, firstname, lastname, company, created_at
    `, [userData.email, userData.passwordHash, userData.firstname, userData.lastname, userData.company || null]);
    return result.rows[0];
  } catch (error) {
    console.log('⚠️ БД недоступна, используем локальное хранилище');
    const newUser = {
      id: userIdCounter++,
      email: userData.email,
      firstname: userData.firstname,
      lastname: userData.lastname,
      company: userData.company,
      created_at: new Date()
    };
    localUsers.push({
      ...newUser,
      password_hash: userData.passwordHash,
      is_active: true,
      email_verified: false,
      last_login: null
    });
    return newUser;
  }
}

async function findUserByEmail(email) {
  try {
    const result = await query(`
      SELECT id, email, password_hash, firstname, lastname, company, is_active, email_verified, created_at
      FROM auth_users 
      WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.log('⚠️ БД недоступна, ищем в локальном хранилище');
    return localUsers.find(user => user.email === email) || null;
  }
}

async function updateLastLogin(userId) {
  try {
    await query('UPDATE auth_users SET last_login = NOW() WHERE id = $1', [userId]);
  } catch (error) {
    console.log('⚠️ БД недоступна, пропускаем обновление last_login');
    const user = localUsers.find(u => u.id === userId);
    if (user) user.last_login = new Date();
  }
}

// ============ API МАРШРУТЫ АВТОРИЗАЦИИ ============

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  console.log('🔍 POST /api/auth/register - получен запрос:', req.body);
  try {
    const { firstname, lastname, email, company, password } = req.body;

    // Валидация входных данных
    if (!firstname || !lastname || !email || !password) {
      console.log('❌ Валидация не пройдена: отсутствуют обязательные поля');
      return res.status(400).json({ 
        success: false, 
        message: 'Все обязательные поля должны быть заполнены' 
      });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Неверный формат email адреса' 
      });
    }

    // Проверка длины пароля
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пароль должен содержать минимум 6 символов' 
      });
    }

    // Проверка существования пользователя
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Пользователь с таким email уже существует' 
      });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
    const passwordHash = await bcrypt.hash(password, salt);

    // Создание пользователя
    const newUser = await createUser({
      email,
      passwordHash,
      firstname,
      lastname,
      company
    });

    // Генерация JWT токена
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        firstname: newUser.firstname,
        lastname: newUser.lastname 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Сохранение сессии (хешируем токен для безопасности)
    try {
      const tokenHash = await bcrypt.hash(token, 10);
      await query(`
        INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES ($1, $2, NOW() + INTERVAL '24 hours', $3, $4)
      `, [
        newUser.id, 
        tokenHash, 
        req.headers['user-agent'] || '', 
        req.ip || req.connection.remoteAddress
      ]);
    } catch (error) {
      console.log('⚠️ БД недоступна, пропускаем сохранение сессии');
    }

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstname: newUser.firstname,
          lastname: newUser.lastname,
          company: newUser.company,
          createdAt: newUser.created_at
        }
      }
    });

    console.log('✅ Регистрация успешна для:', email);

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email и пароль обязательны для заполнения' 
      });
    }

    // Поиск пользователя
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }

    // Проверка активности аккаунта
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Аккаунт заблокирован. Обратитесь к администратору' 
      });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }

    // Обновление времени последнего входа
    await updateLastLogin(user.id);

    // Генерация JWT токена
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Сохранение сессии
    try {
      const tokenHash = await bcrypt.hash(token, 10);
      await query(`
        INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES ($1, $2, NOW() + INTERVAL '24 hours', $3, $4)
      `, [
        user.id, 
        tokenHash, 
        req.headers['user-agent'] || '', 
        req.ip || req.connection.remoteAddress
      ]);
    } catch (error) {
      console.log('⚠️ БД недоступна, пропускаем сохранение сессии');
    }

    res.json({
      success: true,
      message: 'Успешный вход в систему',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          company: user.company,
          emailVerified: user.email_verified,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
});

// Выход пользователя (удаление сессии)
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Удаление активных сессий пользователя
    await query('DELETE FROM user_sessions WHERE user_id = $1', [decoded.userId]);

    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });

  } catch (error) {
    console.error('❌ Ошибка выхода:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
});

// Проверка токена и получение информации о пользователе
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Получение актуальной информации о пользователе
    const result = await query(`
      SELECT id, email, firstname, lastname, company, is_active, email_verified, last_login, created_at
      FROM auth_users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден или заблокирован' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          company: user.company,
          emailVerified: user.email_verified,
          lastLogin: user.last_login,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Недействительный токен' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен истек' 
      });
    }
    
    console.error('❌ Ошибка проверки токена:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
});

// ============ API МАРШРУТЫ ДАННЫХ ============

// API маршруты

// Получение статистики для dashboard
app.get('/api/statistics', async (req, res) => {
  try {
    const result = await query('SELECT * FROM statistics ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение заказов
app.get('/api/orders', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового пользователя
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового заказа
app.post('/api/orders', async (req, res) => {
  try {
    const { tracking_no, product_name, quantity, status, amount } = req.body;
    const result = await query(
      'INSERT INTO orders (tracking_no, product_name, quantity, status, amount) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tracking_no, product_name, quantity, status, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==============================|| WORKS REF API ||============================== //

// Получение всех фаз
app.get('/api/phases', async (req, res) => {
  try {
    const result = await query('SELECT * FROM phases ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения фаз:', error);
    res.status(500).json({ error: 'Ошибка получения фаз' });
  }
});

// Получение всех работ с их связями
app.get('/api/works', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        w.*,
        p.name as phase_name,
        s.name as stage_name,
        ss.name as substage_name
      FROM works_ref w
      LEFT JOIN phases p ON w.phase_id = p.id
      LEFT JOIN stages s ON w.stage_id = s.id  
      LEFT JOIN substages ss ON w.substage_id = ss.id
      ORDER BY w.sort_order, w.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения работ:', error);
    res.status(500).json({ error: 'Ошибка получения работ' });
  }
});

// Получение материалов для конкретной работы
app.get('/api/works/:workId/materials', async (req, res) => {
  try {
    const { workId } = req.params;
    const result = await query(`
      SELECT 
        m.*,
        wm.consumption_per_work_unit as quantity
      FROM materials m
      JOIN work_materials wm ON m.id = wm.material_id
      WHERE wm.work_id = $1
      ORDER BY m.name
    `, [workId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения материалов:', error);
    res.status(500).json({ error: 'Ошибка получения материалов' });
  }
});

// Создание новой работы
app.post('/api/works', async (req, res) => {
  try {
    const { id, name, phase_id, stage_id, substage_id, unit, unit_price } = req.body;
    const result = await query(
      'INSERT INTO works_ref (id, name, phase_id, stage_id, substage_id, unit, unit_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, name, phase_id, stage_id, substage_id, unit, unit_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания работы:', error);
    res.status(500).json({ error: 'Ошибка создания работы' });
  }
});

// Тестовый маршрут
app.get('/api/test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time');
    res.json({ 
      message: 'API работает!', 
      database_time: result.rows[0].current_time,
      status: 'connected'
    });
  } catch (error) {
    console.error('Ошибка тестового запроса:', error);
    res.status(500).json({ error: 'Ошибка подключения к базе данных' });
  }
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 API доступно по адресу: http://localhost:${PORT}/api/test`);
  
  // Простая проверка подключения без создания таблиц
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Подключение к базе данных проверено:', result.rows[0].current_time);
    
    // Инициализируем таблицы только после успешного подключения
    setTimeout(() => initializeTables().catch(err => console.log('⚠️ Пропускаем инициализацию БД')), 1000);
  } catch (error) {
    console.log('⚠️  Будем работать без базы данных (статические данные)');
    console.log('❌ Ошибка подключения:', error.message);
  }
});

export default app;
