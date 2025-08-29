import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static images folder
app.use(
  "/images/products",
  express.static(path.join(__dirname, "public/images/products"))
);

// MySQL connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "dbphonestore",
  typeCast: (field, next) => {
    if (field.type === 251) return field.buffer();
    return next();
  },
});

// -------------------
// Get all products
// -------------------
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name, p.price, p.stock, p.description, p.category_id,
             pi.image AS image_name
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status = 'active'
      ORDER BY p.id
    `);

    const productsMap = {};

    rows.forEach((row) => {
      if (!productsMap[row.id]) {
        productsMap[row.id] = {
          id: row.id,
          name: row.name,
          price: row.price,
          stock: row.stock,
          description: row.description,
          category_id: row.category_id,
          images: [],
        };
      }

      if (row.image_name) productsMap[row.id].images.push(row.image_name);
    });

    res.json(Object.values(productsMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// -------------------
// Get single product
// -------------------
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `
      SELECT p.id, p.name, p.price, p.stock, p.description, p.category_id,
             pi.image AS image_name
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status = 'active' AND p.id = ?
    `,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Product not found" });

    const product = {
      id: rows[0].id,
      name: rows[0].name,
      price: rows[0].price,
      stock: rows[0].stock,
      description: rows[0].description,
      category_id: rows[0].category_id,
      images: [],
    };

    rows.forEach((row) => {
      if (row.image_name) product.images.push(row.image_name);
    });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// -------------------
// Get all categories
// -------------------
app.get("/api/categories", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.name, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status='active'
      GROUP BY c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// -------------------
// Start server
// -------------------
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
