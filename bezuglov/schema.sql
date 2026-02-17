CREATE DATABASE IF NOT EXISTS autoparts_course
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE autoparts_course;

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Категории
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE
);

-- Бренды
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE
);

-- Товары
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  brand_id INT NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,      -- артикул
  title VARCHAR(220) NOT NULL,          -- название
  description TEXT NULL,
  price INT NOT NULL,                   -- рубли
  stock INT NOT NULL DEFAULT 0,         -- наличие (остаток)
  photo_url VARCHAR(400) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE INDEX idx_products_title ON products(title);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_filters ON products(category_id, brand_id, price, stock);

-- Избранное (user ↔ product)
CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Заказы (со статусом отслеживания)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address VARCHAR(240) NOT NULL,
  total INT NOT NULL,
  status ENUM('in_transit','pickup_point','done') NOT NULL DEFAULT 'in_transit',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Позиции заказа
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  sku VARCHAR(80) NOT NULL,
  title VARCHAR(220) NOT NULL,
  price INT NOT NULL,
  qty INT NOT NULL,
  line_total INT NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
