import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORIES = [
  "Todos",
  "Almoço",
  "Bebida",
  "Sucos",
  "Água com Gás",
  "Água sem Gás",
];

export default function POSView({ onOrderPlaced }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState({}); // { [product_id]: true }

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Estado do Carrinho
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("catalog"); // 'catalog' ou 'cart'
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState("Consumo Local"); // 'Consumo Local', 'Retirada', 'Entrega'
  const [paymentMethod, setPaymentMethod] = useState("Pix"); // 'Dinheiro', 'Cartão', 'Pix'
  const [discount, setDiscount] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        setBackendOffline(false);
      } else {
        setBackendOffline(true);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos no PDV:", err);
      setBackendOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // Funções do Carrinho
  const addToCart = (product) => {
    const productId = product.id ?? product.product_id;
    if (!productId) {
      console.warn("Produto sem ID válido:", product);
      return;
    }

    // Feedback visual: pisca o card por 600ms
    setAddedFeedback((prev) => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => {
        const n = { ...prev };
        delete n[productId];
        return n;
      });
    }, 600);

    // Garante que temos um preço numérico válido
    const price = Number(product.price) || 0;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === productId);
      if (existing) {
        return prevCart.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [
          ...prevCart,
          {
            product_id: productId,
            product_name: product.name || "Produto",
            unit_price: price,
            quantity: 1,
            notes: "",
          },
        ];
      }
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + amount;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  const updateItemNotes = (productId, notes) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId ? { ...item, notes } : item,
      ),
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product_id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setTableNumber("");
    setOrderType("Consumo Local");
    setPaymentMethod("Pix");
    setDiscount("");
  };

  // Cálculos do Carrinho
  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = Number(item.unit_price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + unitPrice * quantity;
  }, 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);

  // Enviar pedido para a API
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    const orderPayload = {
      customer_name: customerName,
      table_number: tableNumber,
      order_type: orderType,
      payment_method: paymentMethod,
      status: "Pendente",
      subtotal,
      discount: discountVal,
      total,
      items: cart,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const createdOrder = await res.json();

        // Notifica o componente pai que o pedido foi finalizado para abrir modal de recibo
        if (onOrderPlaced) {
          // Buscamos o pedido recém-criado completo
          onOrderPlaced(createdOrder.id);
        }

        clearCart();
      } else {
        const err = await res.json();
        alert(`Erro ao finalizar pedido: ${err.error}`);
      }
    } catch (err) {
      console.error("Erro no checkout:", err);
      alert("Não foi possível conectar ao servidor backend.");
    }
  };

  // Filtragem
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      data-pos-view
      className="pos-container"
    >
      {/* Seletor de Abas Mobile */}
      <div className="mobile-pos-tabs">
        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
          onClick={() => setActiveTab("catalog")}
        >
          <UtensilsCrossed size={18} />
          <span>Cardápio</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === "cart" ? "active" : ""}`}
          onClick={() => setActiveTab("cart")}
        >
          <ShoppingCart size={18} />
          <span>Carrinho ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
        </button>
      </div>

      {/* Coluna Esquerda: Catálogo */}
      <div className={`pos-catalog-column ${activeTab === "catalog" ? "active" : ""}`}>
        <div className="view-header" style={{ marginBottom: "16px" }}>
          <div className="view-title">
            <h1>Ponto de Venda</h1>
            <p>Selecione produtos para registrar um novo pedido</p>
          </div>
        </div>

        {/* Busca e Categorias */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: "40px" }}
              placeholder="Buscar produto por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Abas de Categorias */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "6px",
              whiteSpace: "nowrap",
              scrollbarWidth: "thin",
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  flexShrink: 0,
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catálogo de Produtos (Scrollable) */}
        <div style={{ flexGrow: 1, overflowY: "auto", paddingRight: "4px" }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--text-secondary)",
              }}
            >
              <span>⏳ Carregando cardápio...</span>
            </div>
          ) : backendOffline ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--danger-color)",
              }}
            >
              <strong>
                <span>⚠️ Servidor offline</span>
              </strong>
              <br />
              <span
                style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}
              >
                <span>
                  Não foi possível conectar ao backend.
                </span>
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--text-secondary)",
              }}
            >
              <span>Nenhum produto cadastrado nesta categoria.</span>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => {
                const pid = product.id ?? product.product_id;
                const isAdded = !!addedFeedback[pid];
                return (
                  <div
                    key={pid}
                    className="card"
                    onClick={() => addToCart(product)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "16px",
                      cursor: "pointer",
                      borderRadius: "var(--radius-md)",
                      border: isAdded
                        ? "2px solid var(--success-color)"
                        : "1px solid var(--border-color)",
                      backgroundColor: isAdded
                        ? "rgba(16, 185, 129, 0.08)"
                        : undefined,
                      transition:
                        "transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isAdded) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor =
                          "var(--accent-color)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAdded) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor =
                          "var(--border-color)";
                      }
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {product.category}
                      </span>
                      <h3
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          margin: "4px 0 6px 0",
                          color: "var(--text-primary)",
                        }}
                      >
                        {product.name}
                      </h3>
                      {product.description && (
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            lineHeight: "1.3",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            marginBottom: "12px",
                          }}
                        >
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--success-color)",
                          fontSize: "1.05rem",
                        }}
                      >
                        R$ {parseFloat(product.price || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        style={{
                          backgroundColor: isAdded
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(59, 130, 246, 0.1)",
                          color: isAdded
                            ? "var(--success-color)"
                            : "var(--accent-color)",
                          padding: "4px",
                          borderRadius: "6px",
                          display: "flex",
                          border: "none",
                          cursor: "pointer",
                          transition: "background-color 0.2s, color 0.2s",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        title="Adicionar ao carrinho"
                      >
                        <span>
                          {isAdded ? <Check size={16} /> : <Plus size={16} />}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: Carrinho */}
      <div className={`card pos-cart-column ${activeTab === "cart" ? "active" : ""}`}>
        {/* Cabeçalho do Carrinho */}
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "12px",
          }}
        >
          <ShoppingCart size={20} />{" "}
          <span>
            Carrinho ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </span>
        </h2>

        {/* Lista de Itens no Carrinho (Scrollable) */}
        <div className="cart-items-container" style={{ flexGrow: 1, overflowY: "auto", marginBottom: "16px", paddingRight: "4px" }}>
          {cart.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                textAlign: "center",
                gap: "8px",
              }}
            >
              <ShoppingCart size={36} strokeWidth={1.5} />
              <span>
                Seu carrinho está vazio.
                <br />
                Clique nos produtos ao lado para adicionar.
              </span>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    paddingBottom: "12px",
                    borderBottom: "1px solid var(--bg-tertiary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {item.product_name}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "var(--success-color)",
                      }}
                    >
                      R$ {(item.unit_price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Controles de Quantidade e Observações */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "2px 6px", borderRadius: "4px" }}
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "2px 6px", borderRadius: "4px" }}
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: "4px 6px",
                        color: "var(--danger-color)",
                        border: "none",
                        background: "none",
                      }}
                      onClick={() => removeFromCart(item.product_id)}
                      title="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Input de Observação */}
                  <input
                    type="text"
                    className="form-control"
                    style={{
                      marginTop: "8px",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-primary)",
                    }}
                    placeholder="Observações (ex: Sem cebola, gelo...)"
                    value={item.notes}
                    onChange={(e) =>
                      updateItemNotes(item.product_id, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações do Cliente & Configuração do Pedido */}
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div className="pos-customer-grid">
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Cliente
              </label>
              <input
                type="text"
                className="form-control"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                placeholder="Nome do cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Mesa/Ref
              </label>
              <input
                type="text"
                className="form-control"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                placeholder="Ex: 05"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="pos-type-pay-grid">
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Tipo Pedido
              </label>
              <select
                className="form-control"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="Consumo Local">Mesa / Local</option>
                <option value="Retirada">Retirada</option>
                <option value="Entrega">Entrega</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Forma Pagto
              </label>
              <select
                className="form-control"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Desconto (R$)
            </label>
            <div style={{ position: "relative" }}>
              <Tag
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                style={{ padding: "8px 12px 8px 30px", fontSize: "0.85rem" }}
                placeholder="R$ 0,00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px dashed var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontSize: "0.85rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "var(--text-secondary)",
            }}
          >
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {discountVal > 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--danger-color)",
              }}
            >
              <span>Desconto:</span>
              <span>- R$ {discountVal.toFixed(2)}</span>
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "var(--text-primary)",
              marginTop: "4px",
            }}
          >
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botão de Finalização */}
        <button
          type="button"
          className="btn btn-success"
          style={{
            width: "100%",
            marginTop: "16px",
            padding: "12px",
            fontSize: "0.95rem",
          }}
          disabled={cart.length === 0}
          onClick={handleCheckout}
        >
          <Check size={18} /> <span>Finalizar & Imprimir</span>
        </button>
      </div>
    </div>
  );
}
