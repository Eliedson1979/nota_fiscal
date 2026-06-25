const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
let db;

function initDb() {
  console.log('📦 Inicializando banco SQLite...');

  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('✅ Tabelas criadas/verificadas.');

  const row = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (row.count === 0) {
    console.log('🌱 Inserindo produtos iniciais...');
    const insert = db.prepare(
      'INSERT INTO products (name, price, category, description) VALUES (?, ?, ?, ?)'
    );
    const items = [
      ['Arroz, Feijão e Bife', 24.90, 'Almoço', 'Arroz, feijão, bife acebolado, ovo e salada.'],
      ['Frango Grelhado com Legumes', 22.90, 'Almoço', 'Filé de frango grelhado com legumes salteados e arroz.'],
      ['Refrigerante Lata 350ml', 6.00, 'Bebida', 'Coca-cola, Guaraná, Sprite ou Fanta Uva.'],
      ['Suco Natural de Laranja', 8.50, 'Sucos', 'Suco de laranja natural e espremido na hora, 400ml.'],
      ['Água com Gás 500ml', 4.00, 'Água com Gás', 'Garrafa de água mineral com gás.'],
      ['Água sem Gás 500ml', 3.50, 'Água sem Gás', 'Garrafa de água mineral natural.'],
    ];
    const tx = db.transaction((list) => {
      for (const item of list) insert.run(...item);
    });
    tx(items);
    console.log('🌱 Produtos iniciais inseridos.');
  }
}

function convertParams(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

async function query(text, params = []) {
  const sql = convertParams(text);
  const stmt = db.prepare(sql);
  const upper = text.trim().toUpperCase();

  if (upper.startsWith('SELECT') || upper.includes('RETURNING')) {
    const rows = stmt.all(...params);
    return { rows };
  }

  if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    const result = stmt.run(...params);
    if (upper.startsWith('INSERT')) {
      return { rows: [{ id: Number(result.lastInsertRowid) }] };
    }
    if (result.changes > 0) {
      return { rows: [{ changes: result.changes }] };
    }
    return { rows: [] };
  }

  stmt.run(...params);
  return { rows: [] };
}

function isMock() {
  return false;
}

module.exports = {
  query,
  initDb,
  isMock,
};
