require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../src/db");

async function main() {
  // Заполнение базы тестовыми данными + создание админа
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const categories = [
      ["Фильтры", "filters"],
      ["Тормозная система", "brakes"],
      ["Масла и жидкости", "fluids"],
      ["Подвеска", "suspension"],
      ["Электрика", "electronics"],
      ["Двигатель", "engine"],
    ];

    const brands = ["BOSCH", "MANN", "FEBI", "NGK", "LUK", "SHELL", "CASTROL", "SKF", "ATE"];

    await conn.query("DELETE FROM favorites");
    await conn.query("DELETE FROM order_items");
    await conn.query("DELETE FROM orders");
    await conn.query("DELETE FROM products");
    await conn.query("DELETE FROM categories");
    await conn.query("DELETE FROM brands");

    for (const [name, slug] of categories) {
      await conn.query("INSERT INTO categories (name, slug) VALUES (?,?)", [name, slug]);
    }
    for (const b of brands) {
      await conn.query("INSERT INTO brands (name) VALUES (?)", [b]);
    }

    const [cats] = await conn.query("SELECT id, slug FROM categories");
    const [brs] = await conn.query("SELECT id, name FROM brands");
    const catId = (slug) => cats.find(c => c.slug === slug).id;
    const brandId = (name) => brs.find(b => b.name === name).id;

    const products = [
      [catId("filters"), brandId("MANN"), "W712/95", "Фильтр масляный MANN W712/95", 690, 15,
        "https://images.unsplash.com/photo-1621976360863-3ad2d9d3c0f1?auto=format&fit=crop&w=1200&q=60",
        "Популярный масляный фильтр для многих моделей. Учебная карточка."
      ],
      [catId("brakes"), brandId("ATE"), "13.0460-7185.2", "Колодки тормозные ATE", 3290, 8,
        "https://images.unsplash.com/photo-1605893541264-31b0dfe8e2cf?auto=format&fit=crop&w=1200&q=60",
        "Комплект передних тормозных колодок. Учебная карточка."
      ],
      [catId("fluids"), brandId("SHELL"), "HX8-5W40-4L", "Моторное масло Shell Helix HX8 5W-40 4L", 3190, 20,
        "https://images.unsplash.com/photo-1608556782021-22ea27f1d940?auto=format&fit=crop&w=1200&q=60",
        "Синтетическое масло 5W-40. Учебная карточка."
      ],
      [catId("electronics"), brandId("NGK"), "BKR6E-11", "Свеча зажигания NGK BKR6E-11", 490, 30,
        "https://images.unsplash.com/photo-1517153295259-74eb0b416cee?auto=format&fit=crop&w=1200&q=60",
        "Свеча зажигания для бензиновых двигателей. Учебная карточка."
      ],
      [catId("suspension"), brandId("SKF"), "VKBA-3643", "Подшипник ступицы SKF VKBA-3643", 5490, 4,
        "https://images.unsplash.com/photo-1558981001-5864b3250a69?auto=format&fit=crop&w=1200&q=60",
        "Ступичный подшипник, комплект. Учебная карточка."
      ],
      [catId("engine"), brandId("FEBI"), "02161", "Ремень приводной FEBI 02161", 890, 12,
        "https://images.unsplash.com/photo-1611262588024-9b4f9f9725b6?auto=format&fit=crop&w=1200&q=60",
        "Поликлиновой ремень. Учебная карточка."
      ],
      [catId("fluids"), brandId("CASTROL"), "EDGE-5W30-4L", "Моторное масло Castrol EDGE 5W-30 4L", 3790, 10,
        "https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&w=1200&q=60",
        "Синтетическое масло 5W-30. Учебная карточка."
      ],
      [catId("filters"), brandId("BOSCH"), "0 986 AF0 070", "Фильтр воздушный BOSCH", 990, 0,
        "https://images.unsplash.com/photo-1600267185393-e158a98703de?auto=format&fit=crop&w=1200&q=60",
        "Воздушный фильтр (пример товара без наличия)."
      ],
      [catId("brakes"), brandId("BOSCH"), "0 986 424 800", "Диск тормозной BOSCH", 4490, 6,
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60",
        "Тормозной диск. Учебная карточка."
      ],
      [catId("engine"), brandId("LUK"), "624 3184 00", "Комплект сцепления LUK", 15990, 2,
        "https://images.unsplash.com/photo-1580657010620-83f86f9b8e19?auto=format&fit=crop&w=1200&q=60",
        "Комплект сцепления. Учебная карточка."
      ],
    ];

    for (const p of products) {
      const [category_id, brand_id, sku, title, price, stock, photo_url, description] = p;
      await conn.query(
        `INSERT INTO products (category_id, brand_id, sku, title, price, stock, photo_url, description)
         VALUES (?,?,?,?,?,?,?,?)`,
        [category_id, brand_id, sku, title, price, stock, photo_url, description]
      );
    }

    // Создание администратора
    await conn.query("DELETE FROM users WHERE email IN ('admin@local')");
    const hash = await bcrypt.hash("admin123", 10);
    await conn.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')",
      ["Администратор", "admin@local", hash]
    );

    await conn.commit();
    console.log("Seed выполнен: данные добавлены, admin создан (admin@local / admin123).");
  } catch (e) {
    await conn.rollback();
    console.error("Ошибка seed:", e.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await db.end();
  }
}

main();
