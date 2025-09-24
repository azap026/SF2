# Smetanew Works Management System

Система управления справочником работ на базе React + Node.js + PostgreSQL.

## 🚀 Возможности

- **Frontend**: React 18 + Vite 7.0.4 + Ant Design
- **Backend**: Node.js/Express + PostgreSQL
- **База данных**: 540+ импортированных работ с полной классификацией
- **CRUD операции**: Полное управление фазами, стадиями, подстадиями и работами
- **Импорт/Экспорт**: CSV функциональность
- **Аутентификация**: Система входа и регистрации

## 📦 Установка

### 1. Клонировать репозиторий
```bash
git clone https://github.com/azap026/SF1.git
cd SF1
```

### 2. Настройка переменных окружения

Скопируйте шаблонные файлы и заполните своими данными:

```bash
# Основной .env файл
cp .env.template .env

# Server .env файл
cp server/.env.template server/.env
```

Отредактируйте файлы:
- `.env` - основные настройки
- `server/.env` - строка подключения к PostgreSQL

### 3. Установка зависимостей

```bash
# Frontend зависимости
npm install --legacy-peer-deps

# Backend зависимости
cd server
npm install
cd ..
```

### 4. Настройка базы данных

Создайте базу данных PostgreSQL и выполните SQL скрипт:
```bash
psql -h your_host -U your_user -d your_database -f create_works_ref_database.sql
```

### 5. Импорт данных (опционально)

Если у вас есть CSV файл с работами:
```bash
cd server
node import_csv.js
```

## 🚀 Запуск

### Development mode

Запустите в двух терминалах:

```bash
# Terminal 1 - Backend (порт 3001)
cd server
node index.js

# Terminal 2 - Frontend (порт 3000)
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

## 📊 Структура базы данных

- `phases` - Фазы работ
- `stages` - Стадии работ (связаны с фазами)
- `substages` - Подстадии работ (связаны со стадиями)  
- `works_ref` - Основная таблица работ
- `materials` - Справочник материалов
- `work_materials` - Связь работ и материалов

## 🔧 API Endpoints

- `GET /api/works` - Получить список работ
- `POST /api/works` - Создать работу
- `PUT /api/works/:id` - Обновить работу  
- `DELETE /api/works/:id` - Удалить работу
- `GET /api/phases` - Получить фазы
- `GET /api/stages` - Получить стадии
- `GET /api/substages` - Получить подстадии

## 📁 Структура проекта

```
SF1/
├── src/                    # React frontend
│   ├── pages/
│   │   └── directories/
│   │       └── works.jsx   # Основной интерфейс работ
│   └── api/               # API клиенты
├── server/                # Node.js backend
│   ├── index.js          # Главный сервер файл
│   ├── database.js       # Подключение к БД
│   └── import_csv.js     # Импорт CSV данных
├── create_works_ref_database.sql  # SQL схема БД
└── works_ref_export.csv   # Пример данных
```

## 🐛 Решение проблем

### База данных не подключается
- Проверьте строку подключения в `server/.env`
- Убедитесь, что PostgreSQL сервер запущен
- Проверьте настройки файрволла

### Frontend не запускается
- Используйте `npm install --legacy-peer-deps`
- Проверьте версию Node.js (рекомендуется 18+)

### Backend ошибки
- Проверьте, что все зависимости установлены в папке `server/`
- Убедитесь, что порт 3001 свободен

## 📝 Лицензия

MIT License

## 👨‍💻 Автор

Разработано для системы Smetanew
