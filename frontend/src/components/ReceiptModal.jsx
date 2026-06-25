import { CheckCircle, Copy, Printer, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isBluetoothSupported,
  isBLESupported,
  isSerialSupported,
  printOrderBluetooth,
} from "../utils/bluetoothPrinter";
import { PRINTER_MAX_CHARS, PRINTER_ITEM_NAME_MAX, PRINTER_QTD_MAX, PRINTER_PRICE_PAD } from "../utils/printerConfig";

function centerText(text, width) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

function parseDate(iso) {
  return new Date(iso.replace(" ", "T") + "Z");
}

function generateTextReceipt(order, settings) {
  const W = PRINTER_MAX_CHARS;
  const date = parseDate(order.created_at).toLocaleString("pt-BR");
  let receipt = `${"=".repeat(W)}\n`;
  receipt += `${centerText("RESTAURANTE", W)}\n`;
  receipt += `${centerText(settings.businessName.toUpperCase(), W)}\n`;
  if (settings.cnpj) receipt += `CNPJ: ${settings.cnpj}\n`;
  if (settings.address) receipt += `${settings.address}\n`;
  if (settings.phone) receipt += `Tel: ${settings.phone}\n`;
  receipt += `${"=".repeat(W)}\n`;
  receipt += `PEDIDO: #${order.id}\n`;
  receipt += `DATA: ${date}\n`;
  receipt += `TIPO: ${order.order_type}\n`;
  if (order.table_number) receipt += `MESA: ${order.table_number}\n`;
  if (order.customer_name) receipt += `CLIENTE: ${order.customer_name}\n`;
  receipt += `${"-".repeat(W)}\n`;
  receipt += `${"ITEM".padEnd(PRINTER_ITEM_NAME_MAX)}${"QTD".padEnd(PRINTER_QTD_MAX)}${"TOTAL".padStart(W - PRINTER_ITEM_NAME_MAX - PRINTER_QTD_MAX)}\n`;
  receipt += `${"-".repeat(W)}\n`;

  (order.items || []).forEach((item) => {
    const maxName = PRINTER_ITEM_NAME_MAX;
    const itemName = item.product_name.length > maxName
      ? item.product_name.substring(0, maxName - 3) + "..."
      : item.product_name;
    const quantity = String(item.quantity);
    const totalPrice = (item.unit_price * item.quantity).toFixed(2);
    const priceStr = `R$ ${totalPrice}`;
    const line = `${itemName.padEnd(maxName)}${quantity.padEnd(PRINTER_QTD_MAX)}${priceStr.padStart(W - maxName - PRINTER_QTD_MAX)}`;
    receipt += `${line.substring(0, W)}\n`;
    if (item.notes) {
      receipt += `  Obs: ${item.notes}\n`;
    }
  });

  receipt += `${"-".repeat(W)}\n`;
  receipt += `${"SUBTOTAL:".padEnd(22)}R$ ${parseFloat(order.subtotal).toFixed(2).padStart(8)}\n`;
  if (parseFloat(order.discount) > 0) {
    receipt += `${"DESCONTO:".padEnd(22)}-R$ ${parseFloat(order.discount).toFixed(2).padStart(7)}\n`;
  }
  receipt += `${"TOTAL:".padEnd(22)}R$ ${parseFloat(order.total).toFixed(2).padStart(8)}\n`;
  receipt += `${"=".repeat(W)}\n`;
  receipt += `FORMA DE PAGAMENTO: ${order.payment_method}\n`;
  receipt += `STATUS: ${order.status}\n`;
  receipt += `${"=".repeat(W)}\n`;
  receipt += `${settings.footerMessage || "Obrigado pela preferência!"}\n`;
  receipt += "\n\n\n";
  return receipt;
}

export default function ReceiptModal({ orderId, settings, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printStatus, setPrintStatus] = useState({
    status: "idle",
    message: "",
  });
  const [copied, setCopied] = useState(false);
  const [btSupported, setBtSupported] = useState(false);

  useEffect(() => {
    const supported = isBluetoothSupported();
    const ble = isBLESupported();
    const serial = isSerialSupported();
    setBtSupported(supported);
    console.log(
      "Bluetooth supported?", supported,
      "| BLE:", ble,
      "| Serial:", serial,
    );
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setPrintStatus({
          status: "error",
          message: "Pedido não encontrado no banco de dados.",
        });
      }
    } catch (err) {
      console.error(err);
      setPrintStatus({
        status: "error",
        message: "Erro ao conectar ao servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBluetoothPrint = async () => {
    if (!order) return;
    setPrintStatus({
      status: "printing",
      message: "Conectando e enviando dados para a impressora...",
    });
    try {
      await printOrderBluetooth(order, settings);
      setPrintStatus({
        status: "success",
        message: "Recibo impresso com sucesso!",
      });
    } catch (err) {
      console.error(err);
      const errorMsg = err.message || String(err);
      let hint = "";
      if (errorMsg.includes("Serial") || errorMsg.includes("SPP")) {
        hint = "\nDica: Pareie a impressora pelo sistema operacional primeiro.";
      } else if (errorMsg.includes("BLE") || errorMsg.includes("Bluetooth")) {
        hint = "\nDica: Verifique se a impressora está ligada e no modo de pareamento.";
      }
      setPrintStatus({
        status: "error",
        message: `Erro: ${errorMsg}${hint}`,
      });
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    if (!order) return;
    const textReceipt = generateTextReceipt(order, settings);
    try {
      await navigator.clipboard.writeText(textReceipt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  if (!orderId) return null;

  return (
    <>
      {/* Wrapper de Impressão (apenas visível na impressão) */}
      {order && (
        <div className="receipt-print-wrapper">
          <div className="print-center print-bold" style={{ marginBottom: "0" }}>RESTAURANTE</div>
          <div className="print-center print-bold" style={{ marginTop: "0" }}>
            {settings.businessName.toUpperCase()}
          </div>
          {settings.cnpj && (
            <div className="print-center">CNPJ: {settings.cnpj}</div>
          )}
          {settings.address && (
            <div className="print-center">{settings.address}</div>
          )}
          {settings.phone && (
            <div className="print-center">Tel: {settings.phone}</div>
          )}
          <div className="print-divider"></div>

          <div className="print-center">
            <span className="print-bold">PEDIDO #{order.id}</span>
          </div>
          <div className="print-center">
            {parseDate(order.created_at).toLocaleString("pt-BR")}
          </div>
          <div className="print-center">Tipo: {order.order_type}</div>
          {order.table_number && (
            <div className="print-center">Mesa: {order.table_number}</div>
          )}
          {order.customer_name && (
            <div className="print-center">Cliente: {order.customer_name}</div>
          )}
          <div className="print-divider"></div>

          <div className="print-row print-bold">
            <span>Item</span>
            <span>Qtd</span>
            <span>Total</span>
          </div>
          {(order.items || []).map((item, i) => (
            <div key={i}>
              <div className="print-row">
                <span>{item.product_name}</span>
                <span>{item.quantity}</span>
                <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
              {item.notes && (
                <div className="print-row-indent">Obs: {item.notes}</div>
              )}
            </div>
          ))}
          <div className="print-divider"></div>

          <div className="print-row">
            <span>Subtotal:</span>
            <span>R$ {parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(order.discount) > 0 && (
            <div className="print-row">
              <span>Desconto:</span>
              <span>-R$ {parseFloat(order.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="print-row print-total">
            <span>TOTAL:</span>
            <span>R$ {parseFloat(order.total).toFixed(2)}</span>
          </div>
          <div className="print-divider"></div>

          <div className="print-center">
            Forma de Pagto: {order.payment_method}
          </div>
          <div className="print-center">Status: {order.status}</div>
          <div className="print-divider"></div>

          <div className="print-center">
            {settings.footerMessage || "Obrigado pela preferência!"}
          </div>
          <div style={{ height: "20px" }}></div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          className="card"
          style={{
            width: "90%",
            maxWidth: "700px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Imprimir Cupom
            </h2>
            <button
              className="btn btn-secondary"
              style={{ padding: "4px" }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="receipt-modal-grid" style={{ flexGrow: 1, overflowY: "auto", padding: "20px" }}>
            <div>
              <h3
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                Pré-visualização (58mm)
              </h3>
              {loading ? (
                <div
                  style={{
                    height: "350px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f5f5f0",
                    border: "1px solid #e0e0d5",
                    borderRadius: "4px",
                  }}
                >
                  <RefreshCw size={24} />
                </div>
              ) : order ? (
                <div
                  id="printable-receipt"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    padding: "12px 8px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    border: "1px solid #ddd",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    width: "100%",
                    maxHeight: "380px",
                    overflowY: "auto",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "8px" }}>
                    <strong style={{
                      fontSize: "12px",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                      letterSpacing: "0.05em",
                      marginBottom: "0",
                    }}>
                      RESTAURANTE
                    </strong>
                    <strong style={{
                      fontSize: "12px",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                      letterSpacing: "0.05em",
                      marginTop: "0",
                    }}>
                      {settings.businessName.toUpperCase()}
                    </strong>
                    {settings.cnpj && <div style={{ fontSize: "10px", color: "#333" }}>CNPJ: {settings.cnpj}</div>}
                    {settings.address && (
                      <div style={{
                        fontSize: "10px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}>{settings.address}</div>
                    )}
                    {settings.phone && <div style={{ fontSize: "10px" }}>Tel: {settings.phone}</div>}
                    <div style={{ margin: "6px 0", color: "#999" }}>--------------------------------</div>
                    <strong style={{ fontSize: "12px", letterSpacing: "0.05em" }}>
                      CUPOM DE PEDIDO #{order.id}
                    </strong>
                    <div style={{ fontSize: "10px", marginTop: "2px" }}>
                      {parseDate(order.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div style={{ margin: "6px 0", color: "#999" }}>--------------------------------</div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    {order.customer_name && (
                      <div>Cliente: {order.customer_name}</div>
                    )}
                    {order.table_number && (
                      <div>Mesa/Ref: {order.table_number}</div>
                    )}
                    <div>Tipo: {order.order_type}</div>
                    <div>Pagto: {order.payment_method}</div>
                    <div>--------------------------------</div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", fontWeight: "bold" }}>
                      <span style={{ width: "60%" }}>Item</span>
                      <span style={{ width: "15%", textAlign: "center" }}>
                        Qtd
                      </span>
                      <span style={{ width: "25%", textAlign: "right" }}>
                        Total
                      </span>
                    </div>
                    {order.items &&
                      order.items.map((item, index) => (
                        <div key={index} style={{ margin: "4px 0" }}>
                          <div style={{ display: "flex" }}>
                            <span style={{ width: "60%" }}>
                              {item.product_name}
                            </span>
                            <span style={{ width: "15%", textAlign: "center" }}>
                              {item.quantity}
                            </span>
                            <span style={{ width: "25%", textAlign: "right" }}>
                              {(item.unit_price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          {item.notes && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#555",
                                fontStyle: "italic",
                                paddingLeft: "8px",
                              }}
                            >
                              * {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    <div>--------------------------------</div>
                  </div>

                  <div style={{ textAlign: "right", marginBottom: "8px" }}>
                    <div>
                      Subtotal: R$ {parseFloat(order.subtotal).toFixed(2)}
                    </div>
                    {parseFloat(order.discount) > 0 && (
                      <div>
                        Desconto: -R$ {parseFloat(order.discount).toFixed(2)}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginTop: "2px",
                      }}
                    >
                      TOTAL: R$ {parseFloat(order.total).toFixed(2)}
                    </div>
                    <div>--------------------------------</div>
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "10px",
                      marginTop: "8px",
                    }}
                  >
                    {settings.footerMessage && (
                      <div>{settings.footerMessage}</div>
                    )}
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "9px",
                        color: "#666",
                      }}
                    >
                      Obrigado pela preferência!
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "12px",
                  }}
                >
                  Métodos de Impressão
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      textAlign: "center",
                    }}
                    disabled={loading || !order}
                    onClick={handleSystemPrint}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                      }}
                    >
                      <Printer size={18} /> 1. Via Navegador
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.8,
                        fontWeight: 400,
                      }}
                    >
                      MELHOR OPÇÃO! Funciona com TUDO (USB, Wi-Fi, etc)
                    </span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      textAlign: "center",
                    }}
                    disabled={loading || !order}
                    onClick={handleCopyText}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                      }}
                    >
                      <Copy size={18} /> 2. Copiar Cupom em Texto
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.8,
                        fontWeight: 400,
                      }}
                    >
                      {copied ? "✓ Copiado!" : "Cole em um editor e imprima"}
                    </span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      textAlign: "center",
                      opacity: btSupported ? 1 : 0.7,
                    }}
                    disabled={loading || !order || !btSupported}
                    onClick={handleBluetoothPrint}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                      }}
                    >
                      <Printer size={18} /> 3. Bluetooth (Experimental)
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.8,
                        fontWeight: 400,
                      }}
                    >
                      {!btSupported
                        ? "Use Chrome/Edge (HTTPS ou localhost)"
                        : "Conecta via BLE ou Serial automaticamente"}
                    </span>
                  </button>
                </div>

                {printStatus.status !== "idle" && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      backgroundColor:
                        printStatus.status === "printing"
                          ? "rgba(59, 130, 246, 0.1)"
                          : printStatus.status === "success"
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                      color:
                        printStatus.status === "printing"
                          ? "var(--accent-color)"
                          : printStatus.status === "success"
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      border: `1px solid ${printStatus.status === "printing"
                          ? "var(--accent-color)"
                          : printStatus.status === "success"
                            ? "var(--success-color)"
                            : "var(--danger-color)"
                        }`,
                    }}
                  >
                    {printStatus.status === "printing" && (
                      <RefreshCw
                        size={16}
                        style={{
                          flexShrink: 0,
                          marginTop: "2px",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                    {printStatus.status === "success" && (
                      <CheckCircle
                        size={16}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                    )}
                    {printStatus.status === "error" && (
                      <CheckCircle
                        size={16}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                    )}
                    <div>{printStatus.message}</div>
                  </div>
                )}
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "20px" }}
                onClick={onClose}
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
