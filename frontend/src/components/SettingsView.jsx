import {
  Bluetooth,
  BluetoothSearching,
  CheckCircle,
  Printer,
  RefreshCw,
  Save,
  Unplug,
  Usb,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  bluetoothPrinter,
  isBluetoothSupported,
  isBLESupported,
  isSerialSupported,
} from "../utils/bluetoothPrinter";

export default function SettingsView({ settings, onSaveSettings }) {
  const [formData, setFormData] = useState({
    businessName: "",
    cnpj: "",
    phone: "",
    address: "",
    footerMessage: "",
  });
  const [saved, setSaved] = useState(false);
  const [printerStatus, setPrinterStatus] = useState({
    connected: false,
    name: "",
    message: "",
    status: "disconnected",
    connectionType: null,
  });
  const [pairedDevices, setPairedDevices] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
    const unsubscribe = bluetoothPrinter.onStatusChange((statusData) => {
      setPrinterStatus({
        connected: statusData.connected,
        name: statusData.deviceName,
        message: statusData.message,
        status: statusData.status,
        connectionType: statusData.connectionType,
      });
    });
    loadPairedDevices();
    return unsubscribe;
  }, [settings]);

  const loadPairedDevices = async () => {
    const devices = await bluetoothPrinter.getPairedDevices();
    setPairedDevices(devices);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Deseja redefinir as configurações para os dados padrão?")) return;
    const defaults = {
      businessName: "Costela no Bafo",
      cnpj: "12.345.678/0001-99",
      phone: "(11) 98765-4321",
      address: "Av. Paulista, 1000 - Bela Vista - Sao Paulo/SP",
      footerMessage: "Obrigado pela preferencia! Volte sempre!",
    };
    setFormData(defaults);
    onSaveSettings(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Buscar e parear nova impressora Bluetooth ──
  const handleScanBluetooth = async () => {
    setScanning(true);
    try {
      await bluetoothPrinter.scanAndConnect();
    } catch (err) {
      console.error("Erro ao buscar impressora:", err);
    } finally {
      setScanning(false);
      loadPairedDevices();
    }
  };

  // ── Conectar a dispositivo já pareado ──
  const handleConnectSaved = async (device) => {
    try {
      await bluetoothPrinter.connectToSavedDevice(device);
    } catch (err) {
      console.error("Erro ao conectar:", err);
    }
  };

  // ── Conectar via Serial ──
  const handleConnectSerial = async () => {
    try {
      await bluetoothPrinter.connectSerial();
    } catch (err) {
      console.error("Erro ao conectar via serial:", err);
    }
  };

  // ── Desconectar ──
  const handleDisconnect = async () => {
    try {
      await bluetoothPrinter.disconnect();
    } catch (err) {
      console.error("Erro ao desconectar:", err);
    }
  };

  const getStatusColor = () => {
    switch (printerStatus.status) {
      case "connected": return "var(--success-color)";
      case "error": return "var(--danger-color)";
      case "connecting":
      case "scanning":
      case "printing": return "#fbbf24";
      default: return "var(--text-muted)";
    }
  };

  const getStatusLabel = () => {
    if (printerStatus.connected) {
      const type = printerStatus.connectionType === "ble" ? "BLE" : "Serial";
      return `Conectado (${type}): ${printerStatus.name}`;
    }
    switch (printerStatus.status) {
      case "scanning": return "Buscando dispositivos...";
      case "connecting": return `Conectando${printerStatus.name ? ` a ${printerStatus.name}` : ""}...`;
      case "printing": return "Imprimindo...";
      case "error": return printerStatus.message || "Erro desconhecido";
      default: return "Desconectado";
    }
  };

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto" }}>
      <div className="view-header">
        <div className="view-title">
          <h1>Configurações</h1>
          <p>Configure as informações da sua empresa e impressora térmica</p>
        </div>
      </div>

      {/* ── Guia Rápido ── */}
      <div
        className="card"
        style={{
          marginBottom: "24px",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          border: "1px solid var(--success-color)",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--success-color)",
          }}
        >
          <Printer size={18} /> Como Parear sua Impressora 58mm
        </h3>
        <div style={{ fontSize: "0.85rem", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "8px" }}>
            <strong>1. Impressora BLE (sem fio):</strong>
          </p>
          <ol style={{ paddingLeft: "20px", marginTop: "0", marginBottom: "12px" }}>
            <li>Ligue a impressora e ative o modo <strong>Bluetooth/BLE</strong></li>
            <li>Clique em <strong>"Buscar Impressora Bluetooth"</strong> abaixo</li>
            <li>Selecione sua impressora na lista que o navegador mostrar</li>
            <li>Pronto! A impressora aparecerá como conectada</li>
          </ol>

          <p style={{ marginBottom: "8px" }}>
            <strong>2. Impressora Bluetooth Clássico (MPT-II, etc):</strong>
          </p>
          <ol style={{ paddingLeft: "20px", marginTop: "0", marginBottom: "12px" }}>
            <li>Pareie a impressora pelo <strong>sistema operacional</strong> (Configurações → Bluetooth)</li>
            <li>Clique em <strong>"Conectar Serial (SPP)"</strong> abaixo</li>
            <li>Selecione a porta da impressora na lista</li>
          </ol>

          <p style={{
            marginBottom: "0",
            padding: "8px 12px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderRadius: "6px",
            borderLeft: "3px solid var(--accent-color)",
          }}>
            <strong>Alternativa:</strong> Pareie pelo OS e use <strong>"Imprimir via Navegador"</strong> — funciona com qualquer impressora!
          </p>
        </div>
      </div>

      {/* ── Painel de Conexão Bluetooth ── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "1rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Bluetooth size={18} /> Impressora Bluetooth
        </h3>

        {/* Status */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: printerStatus.connected ? "12px" : "0",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                }}
              >
                Status
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(),
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                />
                <div style={{ fontWeight: 500, fontSize: "0.9rem", whiteSpace: "pre-line", lineHeight: "1.4" }}>
                  {getStatusLabel()}
                </div>
              </div>
            </div>
            {printerStatus.connected && (
              <button
                className="btn btn-secondary"
                onClick={handleDisconnect}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Unplug size={14} /> Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Alerta de erro */}
        {printerStatus.status === "error" && printerStatus.message && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--danger-color)",
              color: "var(--danger-color)",
              fontSize: "0.82rem",
              lineHeight: "1.5",
              whiteSpace: "pre-line",
            }}
          >
            {printerStatus.message}
          </div>
        )}

        {/* Botões de ação (quando desconectado) */}
        {!printerStatus.connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {!isBluetoothSupported() ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                Web Bluetooth e Web Serial não suportados neste navegador. Use Chrome/Edge.
              </p>
            ) : (
              <>
                {/* Botão principal: Buscar Bluetooth */}
                {isBLESupported() && (
                  <button
                    className="btn btn-primary"
                    onClick={handleScanBluetooth}
                    disabled={scanning}
                    style={{
                      width: "100%",
                      padding: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "0.95rem",
                    }}
                  >
                    {scanning ? (
                      <>
                        <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                        Buscando dispositivos...
                      </>
                    ) : (
                      <>
                        <BluetoothSearching size={18} />
                        Buscar Impressora Bluetooth
                      </>
                    )}
                  </button>
                )}

                {/* Botão Serial */}
                {isSerialSupported() && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleConnectSerial}
                    style={{
                      width: "100%",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Usb size={16} /> Conectar Serial (SPP — Bluetooth Clássico)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Lista de dispositivos já pareados */}
        {pairedDevices.length > 0 && !printerStatus.connected && (
          <div style={{ marginTop: "16px" }}>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Dispositivos conhecidos:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pairedDevices.map((device) => (
                <button
                  key={device.id}
                  className="btn btn-secondary"
                  onClick={() => handleConnectSaved(device)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textAlign: "left",
                  }}
                >
                  <Wifi size={14} style={{ flexShrink: 0, color: "var(--accent-color)" }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{device.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {device.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Configurações do Estabelecimento ── */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome do Estabelecimento *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Restaurante Costela no Bafo"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
          </div>

          <div
            className="settings-grid-2"
          >
            <div className="form-group">
              <label className="form-label">CNPJ ou CPF (Opcional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telefone de Contato</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: (11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Endereço Completo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Av. Principal, 123 - Centro"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mensagem de Rodapé</label>
            <textarea
              className="form-control"
              placeholder="Ex: Obrigado pela preferência!"
              rows={3}
              value={formData.footerMessage}
              onChange={(e) => setFormData({ ...formData, footerMessage: e.target.value })}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetDefaults}
            >
              <RefreshCw size={16} /> Restaurar Padrões
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {saved && (
                <span
                  style={{
                    color: "var(--success-color)",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <CheckCircle size={16} /> Configurações salvas!
                </span>
              )}
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Preview do Cabeçalho ── */}
      <div
        className="card"
        style={{
          marginTop: "24px",
          backgroundColor: "rgba(59, 130, 246, 0.05)",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            marginBottom: "8px",
            color: "var(--accent-color)",
          }}
        >
          Visualização do Cabeçalho
        </h3>
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#111111",
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid #e2e2d9",
            fontFamily: "monospace",
            fontSize: "11px",
            textAlign: "center",
            lineHeight: "1.4",
          }}
        >
          <strong style={{ display: "block", marginBottom: "0" }}>
            RESTAURANTE
          </strong>
          <strong style={{ display: "block", marginTop: "0" }}>
            {formData.businessName.toUpperCase() || "NOME DO RESTAURANTE"}
          </strong>
          {formData.cnpj && <div>CNPJ: {formData.cnpj}</div>}
          {formData.address && <div>{formData.address}</div>}
          {formData.phone && <div>Tel: {formData.phone}</div>}
          <div>--------------------------------</div>
        </div>
      </div>
    </div>
  );
}
