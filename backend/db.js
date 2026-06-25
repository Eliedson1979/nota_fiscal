const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

let initialized = false;

async function initDb() {
  if (initialized) return;
  initialized = true;

  console.log('📦 Inicializando banco PostgreSQL...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('✅ Tabelas criadas/verificadas.');

  const result = await pool.query('SELECT COUNT(*)::int as count FROM products');
  if (result.rows[0].count === 0) {
    console.log('🌱 Inserindo produtos iniciais...');
    const items = [
      ['Arroz, Feijão e Bife', 24.90, 'Almoço', 'Arroz, feijão, bife acebolado, ovo e salada.'],
      ['Frango Grelhado com Legumes', 22.90, 'Almoço', 'Filé de frango grelhado com legumes salteados e arroz.'],
      ['Refrigerante Lata 350ml', 6.00, 'Bebida', 'Coca-cola, Guaraná, Sprite ou Fanta Uva.'],
      ['Suco Natural de Laranja', 8.50, 'Sucos', 'Suco de laranja natural e espremido na hora, 400ml.'],
      ['Água com Gás 500ml', 4.00, 'Água com Gás', 'Garrafa de água mineral com gás.'],
      ['Água sem Gás 500ml', 3.50, 'Água sem Gás', 'Garrafa de água mineral natural.'],
    ];
    for (const item of items) {
      await pool.query(
        'INSERT INTO products (name, price, category, description) VALUES ($1, $2, $3, $4)',
        item
      );
    }
    console.log('🌱 Produtos iniciais inseridos.');
  }
}

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return { rows: result.rows };
}

function isMock() {
  return false;
}

module.exports = { query, initDb, isMock, pool };
