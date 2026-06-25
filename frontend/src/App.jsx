import { useEffect, useState } from "react";
import {
  LayoutDashboard, Moon, Receipt, Settings, ShoppingCart, Sun, UtensilsCrossed,
} from "lucide-react";
import DashboardView from "./components/DashboardView";
import OrdersView from "./components/OrdersView";
import POSView from "./components/POSView";
import ProductsView from "./components/ProductsView";
import ReceiptModal from "./components/ReceiptModal";
import SettingsView from "./components/SettingsView";
import { bluetoothPrinter } from "./utils/bluetoothPrinter";

const DEFAULT_SETTINGS = {
  businessName: "Costela no Bafo",
  cnpj: "12.345.678/0001-99",
  phone: "(11) 98765-4321",
  address: "Av. Paulista, 1000 - Bela Vista - Sao Paulo/SP",
  footerMessage: "Obrigado pela preferencia! Volte sempre!",
};

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "light");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activePrintOrderId, setActivePrintOrderId] = useState(null);
  const [printerStatus, setPrinterStatus] = useState({
    connected: false,
    name: "Desconectada",
  });

  useEffect(() => {
    const unsubscribe = bluetoothPrinter.onStatusChange((status) => {
      setPrinterStatus({
        connected: status.connected,
        name: status.deviceName || "Desconectada",
      });
    });
    return unsubscribe;
  }, []);

  // Debug log: quando currentView mudar
  useEffect(() => {
    console.log("🗺️ Tela atual mudou para:", currentView);
  }, [currentView]);

  const handleNavClick = (view) => {
    console.log("🔘 Botão de navegação clicado:", view);
    setCurrentView(view);
  };

  // Carrega configurações salvas no localStorage ao iniciar
  useEffect(() => {
    const savedSettings = localStorage.getItem("restaurant_receipt_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error(
          "Erro ao ler configuracoes salvas, restaurando padrao:",
          err,
        );
      }
    }
  }, []);

  // Controla Tema Claro / Escuro
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("app_theme", next);
      return next;
    });
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(
      "restaurant_receipt_settings",
      JSON.stringify(newSettings),
    );
  };

  const renderActiveView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardView
            printerConnected={printerStatus.connected}
            activePrinterName={printerStatus.name}
          />
        );
      case "pos":
        return <POSView onOrderPlaced={(id) => setActivePrintOrderId(id)} />;
      case "products":
        return <ProductsView />;
      case "orders":
        return <OrdersView onPrintOrder={(id) => setActivePrintOrderId(id)} />;
      case "settings":
        return (
          <SettingsView settings={settings} onSaveSettings={saveSettings} />
        );
      default:
        return (
          <DashboardView
            printerConnected={printerStatus.connected}
            activePrinterName={printerStatus.name}
          />
        );
    }
  };

  return (
    <>
      <div className="app-container">
        {/* Sidebar de Navegação */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Receipt size={24} style={{ transform: "rotate(-10deg)" }} />
            </div>
            <div className="brand-info">
              <h2>Costela no Bafo</h2>
              <span>Nota-Fiscal</span>
            </div>
          </div>

          <nav className="nav-menu">
            <button
              type="button"
              className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick("dashboard")}
            >
              <LayoutDashboard size={20} />
              <span>Painel Inicial</span>
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "pos" ? "active" : ""}`}
              onClick={() => handleNavClick("pos")}
            >
              <ShoppingCart size={20} />
              <span>Ponto de Venda</span>
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "orders" ? "active" : ""}`}
              onClick={() => handleNavClick("orders")}
            >
              <Receipt size={20} />
              <span>Histórico de Pedidos</span>
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "products" ? "active" : ""}`}
              onClick={() => handleNavClick("products")}
            >
              <UtensilsCrossed size={20} />
              <span>Cardápio / Produtos</span>
            </button>

            <button
              type="button"
              className={`nav-item ${currentView === "settings" ? "active" : ""}`}
              onClick={() => handleNavClick("settings")}
            >
              <Settings size={20} />
              <span>Configurações</span>
            </button>
          </nav>

          {/* Footer do Sidebar com Toggle de Tema */}
          <div className="sidebar-theme-toggle">
            <span>Tema</span>
            <button onClick={toggleTheme} className="theme-toggle-btn">
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Escuro" : "Claro"}</span>
            </button>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="main-content">{renderActiveView()}</main>
      </div>

      {/* Modal de Impressão (fora do app-container para impressão!) */}
      {activePrintOrderId && (
        <ReceiptModal
          orderId={activePrintOrderId}
          settings={settings}
          onClose={() => setActivePrintOrderId(null)}
        />
      )}
    </>
  );
}

export default App;
