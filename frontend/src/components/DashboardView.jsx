import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Clock, Award, Printer } from 'lucide-react';

export default function DashboardView({ activePrinterName = "Desconectada", printerConnected = false }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrdersCount: 0,
    pendingOrdersCount: 0,
    completedOrdersCount: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando dados estatísticos...</p>
      </div>
    );
  }

  // Acha o maior valor para normalizar o gráfico de barras
  const maxQty = stats.topProducts.reduce((max, item) => item.qty > max ? item.qty : max, 0) || 1;

  return (
    <div>
      <div className="view-header">
        <div className="view-title">
          <h1>Dashboard</h1>
          <p>Visão geral das vendas e desempenho do restaurante hoje</p>
        </div>
        
      </div>

      {/* Grid de Cards Métricos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Faturamento */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--success-color)',
            borderRadius: '12px'
          }}>
            <DollarSign size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FATURAMENTO HOJE</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px' }}>
              R$ {stats.todaySales.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Card 2: Quantidade de Pedidos */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--accent-color)',
            borderRadius: '12px'
          }}>
            <ShoppingBag size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PEDIDOS HOJE</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.todayOrdersCount}
            </h3>
          </div>
        </div>

        {/* Card 3: Pedidos Pendentes */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: 'var(--warning-color)',
            borderRadius: '12px'
          }}>
            <Clock size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PENDENTES HOJE</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.pendingOrdersCount}
            </h3>
          </div>
        </div>

        {/* Card 4: Status da Impressora */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '12px',
            backgroundColor: printerConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: printerConnected ? 'var(--success-color)' : 'var(--danger-color)',
            borderRadius: '12px',
            flexShrink: 0,
          }}>
            <Printer size={28} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>IMPRESSORA 58mm</p>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', marginBottom: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {printerConnected ? activePrinterName : 'Desconectada'}
            </h3>
          </div>
        </div>
      </div>

      {/* Grid Inferior: Mais Vendidos & Status da Impressora */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {/* Mais Vendidos */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--warning-color)' }} /> Mais Vendidos do Dia
          </h2>
          
          {stats.topProducts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
              Nenhum produto vendido hoje ainda.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stats.topProducts.map((item, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{index + 1}. {item.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.qty} un.</span>
                  </div>
                  {/* Barra de progresso */}
                  <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: index === 0 ? 'var(--accent-color)' : 'var(--text-secondary)',
                      width: `${(item.qty / maxQty) * 100}%`,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-out'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações Rápidas e Dicas */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Dicas para Impressora 58mm</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <p>
                💡 <strong>Alinhamento do Sistema:</strong> Caso sua impressora não possua Bluetooth Low Energy (BLE), você pode pareá-la normalmente no Windows/Android e clicar em <strong>"Imprimir (Janela)"</strong> para enviar o cupom formatado via driver nativo.
              </p>
              <p>
                💡 <strong>Bluetooth Direto:</strong> Certifique-se de que a impressora está ligada e visível. O pareamento direto consome menos recursos e envia comandos ESC/POS puros de 32 colunas.
              </p>
              <p>
                💡 <strong>Economia de Bobina:</strong> O app foi otimizado para rolos de 58mm, encurtando o cabeçalho e reduzindo margens desnecessárias para economizar papel.
              </p>
            </div>
          </div>
          
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            📋 Registre novos pedidos na aba <strong>Vender (PDV)</strong> para gerar notas fiscais instantâneas.
          </div>
        </div>
      </div>
    </div>
  );
}
