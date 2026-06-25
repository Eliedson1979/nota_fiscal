import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, RefreshCw } from 'lucide-react';

const CATEGORIES = ['Almoço', 'Bebida', 'Sucos', 'Água com Gás', 'Água sem Gás'];

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Almoço',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: CATEGORIES[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      description: product.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este produto do cardápio?')) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Erro ao deletar produto:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, price, category, description } = formData;
    
    if (!name || !price || !category) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      name,
      price: parseFloat(price),
      category,
      description
    };

    try {
      let url = '/api/products';
      let method = 'POST';
      
      if (editingProduct) {
        url = `/api/products/${editingProduct.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedProduct = await res.json();
        if (editingProduct) {
          setProducts(products.map(p => p.id === editingProduct.id ? savedProduct : p));
        } else {
          setProducts([...products, savedProduct]);
        }
        setIsModalOpen(false);
      } else {
        const errorData = await res.json();
        alert(`Erro: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    }
  };

  // Filtragem e busca
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="view-header">
        <div className="view-title">
          <h1>Cardápio & Produtos</h1>
          <p>Cadastre e gerencie os itens e preços oferecidos no restaurante</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchProducts} title="Recarregar cardápio">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Cadastrar Produto
          </button>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Busca */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '40px' }}
              placeholder="Buscar por nome ou descrição do produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Categorias */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              className={`btn ${categoryFilter === 'Todos' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setCategoryFilter('Todos')}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Produtos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Carregando cardápio...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Nenhum produto encontrado correspondente aos filtros.
        </div>
      ) : (
        <>
          {/* Tabela para Desktop */}
          <div className="table-container products-desktop-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Descrição</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                    <td>
                      <span className="badge badge-pending" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}>
                        {product.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                      R$ {parseFloat(product.price).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.description || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleOpenEditModal(product)}
                          title="Editar produto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Deletar produto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista para Mobile */}
          <div className="products-mobile-list">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-mobile-card">
                <div className="product-mobile-info">
                  <span className="product-mobile-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  {product.description && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="product-mobile-price">
                  R$ {parseFloat(product.price).toFixed(2)}
                </div>
                <div className="product-mobile-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenEditModal(product)}
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteProduct(product.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Produto *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Suco de Abacaxi 400ml"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Preço (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="Ex: 15.90"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição (Opcional)</label>
                  <textarea
                    className="form-control"
                    placeholder="Breve descrição dos ingredientes ou tamanho..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
