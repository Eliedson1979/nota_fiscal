import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Printer, Calendar, User, Hash, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function OrdersView({ onPrintOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
      } else {
        alert('Erro ao atualizar status do pedido.');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pendente': return 'badge badge-pending';
      case 'Preparando': return 'badge badge-pending'; // Usando badge-pending como fallback
      case 'Finalizado': return 'badge badge-completed';
      case 'Cancelado': return 'badge badge-cancelled';
      default: return 'badge';
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString.replace(" ", "T") + "Z").toLocaleDateString('pt-BR', options);
  };

  const toggleExpand = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer_name && order.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      order.id.toString().includes(search) ||
      (order.table_number && order.table_number.includes(search));
    return matchesSearch;
  });

  return (
    <div>
      <div className="view-header">
        <div className="view-title">
          <h1>Histórico de Pedidos</h1>
          <p>Gerencie o status e faça reimpressão de notas fiscais dos pedidos registrados</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar Lista
        </button>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
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
          placeholder="Buscar por cliente, nº do pedido ou mesa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabela de Pedidos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Carregando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Nenhum pedido encontrado.
          </div>
        ) : (
          <>
            {/* Tabela para Desktop */}
            <div className="desktop-orders-table" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nº Pedido</th>
                    <th>Data/Hora</th>
                    <th>Cliente</th>
                    <th>Mesa</th>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <React.Fragment key={order.id}>
                      <tr>
                        <td style={{ fontWeight: 600 }}>#{order.id}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            {formatDate(order.created_at)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} style={{ color: 'var(--text-muted)' }} />
                            {order.customer_name || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>}
                          </div>
                        </td>
                        <td>
                          {order.table_number ? (
                            <span style={{ fontWeight: 600 }}>Mesa {order.table_number}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{order.order_type}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success-color)' }}>
                          R$ {parseFloat(order.total).toFixed(2)}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{order.payment_method}</span>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(order.status)}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px' }}
                              onClick={() => toggleExpand(order.id)}
                              title={expandedOrder === order.id ? "Ocultar itens" : "Ver itens"}
                            >
                              {expandedOrder === order.id ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', gap: '4px' }}
                              onClick={() => onPrintOrder(order.id)}
                            >
                              <Printer size={14} /> Imprimir
                            </button>

                            <select
                              className="form-control"
                              style={{ padding: '2px 6px', fontSize: '0.8rem', width: 'auto', display: 'inline-block' }}
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Preparando">Preparando</option>
                              <option value="Finalizado">Finalizado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Linha de Detalhes Expandidos (Desktop) */}
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={9} style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px 24px' }}>
                            <div style={{ maxWidth: '600px' }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Itens do Pedido</h4>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'var(--bg-primary)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '12px',
                                border: '1px solid var(--border-color)'
                              }}>
                                {order.items && order.items.map((item, idx) => (
                                  <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.85rem',
                                    paddingBottom: '8px',
                                    borderBottom: idx < order.items.length - 1 ? '1px solid var(--bg-tertiary)' : 'none'
                                  }}>
                                    <div>
                                      <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.product_name}
                                      {item.notes && (
                                        <div style={{
                                          fontSize: '0.75rem',
                                          color: 'var(--danger-color)',
                                          fontStyle: 'italic',
                                          marginTop: '2px'
                                        }}>
                                          Obs: {item.notes}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 500 }}>
                                      R$ {(item.unit_price * item.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Resumo financeiro rápido */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '20px',
                                marginTop: '12px',
                                fontSize: '0.85rem',
                                fontWeight: 500
                              }}>
                                <div>Subtotal: R$ {parseFloat(order.subtotal).toFixed(2)}</div>
                                {parseFloat(order.discount) > 0 && (
                                  <div style={{ color: 'var(--danger-color)' }}>
                                    Desconto: - R$ {parseFloat(order.discount).toFixed(2)}
                                  </div>
                                )}
                                <div style={{ fontWeight: 700 }}>Total: R$ {parseFloat(order.total).toFixed(2)}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lista de Pedidos para Mobile */}
            <div className="mobile-orders-list">
              {filteredOrders.map(order => (
                <div key={order.id} className="mobile-order-card card">
                  <div className="mobile-order-header">
                    <span className="order-id">Pedido #{order.id}</span>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mobile-order-body">
                    <div className="mobile-order-row">
                      <Calendar size={14} className="icon" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="mobile-order-row">
                      <User size={14} className="icon" />
                      <span>{order.customer_name || 'Consumidor'}</span>
                      {order.table_number && (
                        <span className="table-badge">Mesa {order.table_number}</span>
                      )}
                    </div>
                    <div className="mobile-order-row summary-row">
                      <span className="type-pay">{order.order_type} • {order.payment_method}</span>
                      <span className="total-val">R$ {parseFloat(order.total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mobile-order-actions">
                    <button
                      className="btn btn-secondary btn-icon"
                      onClick={() => toggleExpand(order.id)}
                      title={expandedOrder === order.id ? "Ocultar itens" : "Ver itens"}
                    >
                      {expandedOrder === order.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    
                    <button
                      className="btn btn-primary"
                      onClick={() => onPrintOrder(order.id)}
                    >
                      <Printer size={16} /> Imprimir
                    </button>

                    <select
                      className="form-control status-select"
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Preparando">Preparando</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  {/* Detalhes Expandidos (Mobile) */}
                  {expandedOrder === order.id && (
                    <div className="mobile-order-details">
                      <h4>Itens do Pedido</h4>
                      <div className="items-list">
                        {order.items && order.items.map((item, idx) => (
                          <div key={idx} className="item-row">
                            <div className="item-info">
                              <span className="qty">{item.quantity}x</span> {item.product_name}
                              {item.notes && <div className="notes">Obs: {item.notes}</div>}
                            </div>
                            <div className="price">R$ {(item.unit_price * item.quantity).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="financial-summary">
                        <div>Subtotal: R$ {parseFloat(order.subtotal).toFixed(2)}</div>
                        {parseFloat(order.discount) > 0 && (
                          <div className="discount">Desconto: - R$ {parseFloat(order.discount).toFixed(2)}</div>
                        )}
                        <div className="total">Total: R$ {parseFloat(order.total).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
