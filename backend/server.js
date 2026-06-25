const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Inicializa a conexão com banco de dados Neon ou modo Mock
db.initDb();

// ----------------------------------------------------
// ROTAS DE PRODUTOS (CARDÁPIO)
// ----------------------------------------------------

// Retorna todos os produtos
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Adiciona um novo produto
app.post('/api/products', async (req, res) => {
  const { name, price, category, description } = req.body;
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Nome, preço e categoria são campos obrigatórios.' });
  }
  
  try {
    const result = await db.query(
      'INSERT INTO products (name, price, category, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, parseFloat(price), category, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao adicionar produto:', err.message);
    res.status(500).json({ error: 'Erro ao adicionar produto' });
  }
});

// Edita um produto
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description } = req.body;
  
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Nome, preço e categoria são campos obrigatórios.' });
  }

  try {
    const result = await db.query(
      'UPDATE products SET name = $1, price = $2, category = $3, description = $4 WHERE id = $5 RETURNING *',
      [name, parseFloat(price), category, description || '', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar produto:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Remove um produto
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Produto deletado com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar produto:', err.message);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// ----------------------------------------------------
// ROTAS DE PEDIDOS (ORDERS)
// ----------------------------------------------------

// Retorna todos os pedidos
app.get('/api/orders', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// Retorna itens de um pedido específico
app.get('/api/orders/:id/items', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar itens do pedido:', err.message);
    res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
  }
});

// Retorna um pedido específico com seus itens inclusos
app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    
    const itemsResult = await db.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [id]
    );
    
    const order = orderResult.rows[0];
    order.items = itemsResult.rows;
    
    res.json(order);
  } catch (err) {
    console.error('Erro ao buscar detalhes do pedido:', err.message);
    res.status(500).json({ error: 'Erro ao buscar detalhes do pedido' });
  }
});

// Cria um novo pedido (com transação se estiver em banco Neon/Real)
app.post('/api/orders', async (req, res) => {
  const { customer_name, table_number, order_type, payment_method, status, subtotal, discount, total, items } = req.body;
  
  if (!order_type || !payment_method || subtotal === undefined || total === undefined || !items || items.length === 0) {
    return res.status(400).json({ error: 'Dados do pedido inválidos ou incompletos.' });
  }

  try {
    const orderRes = await db.query(
      `INSERT INTO orders (customer_name, table_number, order_type, payment_method, status, subtotal, discount, total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [customer_name || '', table_number || '', order_type, payment_method, status || 'Pendente', subtotal, discount || 0.00, total]
    );
    
    const orderId = orderRes.rows[0].id;
    
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, notes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.notes || '']
      );
    }
    
    res.status(201).json({ id: orderId, message: 'Pedido registrado com sucesso.' });
  } catch (err) {
    console.error('Erro ao salvar pedido:', err.message);
    res.status(500).json({ error: 'Erro ao salvar pedido' });
  }
});

// Altera o status do pedido (ex: Pago, Cancelado)
const updateStatusHandler = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório.' });
  }

  try {
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao alterar status do pedido:', err.message);
    res.status(500).json({ error: 'Erro ao alterar status do pedido' });
  }
};

app.put('/api/orders/:id/status', updateStatusHandler);
app.patch('/api/orders/:id/status', updateStatusHandler);


// ----------------------------------------------------
// ROTA DE ESTATÍSTICAS (DASHBOARD)
// ----------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const ordersRes = await db.query('SELECT * FROM orders');
    const orders = ordersRes.rows;

    const today = new Date().toDateString();

    const todayOrders = orders.filter(o => new Date(o.created_at.replace(" ", "T") + "Z").toDateString() === today);
    const todaySales = todayOrders
      .filter(o => o.status === 'Pago')
      .reduce((sum, o) => sum + parseFloat(o.total), 0);

    const pendingOrdersCount = orders.filter(o => o.status === 'Pendente').length;
    const completedOrdersCount = orders.filter(o => o.status === 'Pago').length;

    const topProdRes = await db.query(`
      SELECT p.name, SUM(oi.quantity) as qty
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'Pago'
      GROUP BY p.name
      ORDER BY qty DESC
      LIMIT 5
    `);
    let topProducts = topProdRes.rows.map(row => ({ name: row.name, qty: parseInt(row.qty, 10) }));

    if (topProducts.length === 0) {
      const productsRes = await db.query('SELECT * FROM products LIMIT 3');
      topProducts = productsRes.rows.map(p => ({ name: p.name, qty: 0 }));
    }

    res.json({
      todaySales,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount,
      completedOrdersCount,
      topProducts
    });
  } catch (err) {
    console.error('Erro ao calcular estatísticas:', err.message);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// Inicialização do Servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
  });
}

module.exports = app;
