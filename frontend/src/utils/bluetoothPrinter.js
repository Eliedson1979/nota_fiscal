/**
 * Serviço de impressão Bluetooth para impressoras térmicas 58mm.
 * Suporta: Web Bluetooth (BLE) + Web Serial API (Bluetooth Classic/SPP).
 *
 * Impressoras BLE comuns: Xprinter XP-N160II, Bematech, Elgin, TM-P20.
 * Impressoras SPP/Classic: MPT-II, MPT-II Pro, impressoras genéricas 58mm.
 */

// ── UUIDs BLE para impressoras térmicas 58mm ──────────────────────────
const PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000e7e1-0000-1000-8000-00805f9b34fb",
  "e7e1a2c0-296b-11e5-9730-0002a5d5c51b",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ffe5-0000-1000-8000-00805f9b34fb",
  "0000ffb0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "00001800-0000-1000-8000-00805f9b34fb",
  "00001801-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
];

// Características comuns para escrita
const PRINTER_CHARACTERISTICS = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "0000ffe4-0000-1000-8000-00805f9b34fb",
  "0000ffb2-0000-1000-8000-00805f9b34fb",
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
];

// Baud rates para Serial
const SERIAL_BAUD_RATES = [9600, 19200, 38400, 57600, 115200];

// Timeout para GATT connect (evita travamento com dispositivos SPP)
const GATT_CONNECT_TIMEOUT_MS = 8000;

// ── Helper: GATT connect com timeout ─────────────────────────────────
function gattConnectWithTimeout(device, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    device.gatt
      .connect()
      .then((server) => {
        clearTimeout(timer);
        resolve(server);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

class BluetoothPrinterService {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.serialPort = null;
    this.listeners = [];
    this.status = "disconnected";
    this.message = "Desconectado";
    this.deviceName = "";
    this.connectionType = null;
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
    this.notifyStatus(this.status, this.message);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  notifyStatus(status, message = "") {
    this.status = status;
    this.message = message;
    const data = {
      status,
      message,
      deviceName: this.deviceName,
      connected: this.isConnected(),
      connectionType: this.connectionType,
    };
    for (const cb of this.listeners) {
      cb(data);
    }
  }

  isConnected() {
    if (this.connectionType === "ble") {
      return this.device && this.device.gatt && this.device.gatt.connected;
    }
    if (this.connectionType === "serial") {
      return this.serialPort && this.serialPort.readable && this.serialPort.writable;
    }
    return false;
  }

  // ── Listar dispositivos BLE já concedidos pelo navegador ───────────
  async getPairedDevices() {
    if (!navigator.bluetooth) return [];

    try {
      const devices = await navigator.bluetooth.getDevices();
      return devices.map((d) => ({
        id: d.id,
        name: d.name || "Dispositivo Desconhecido",
        gatt: d.gatt,
      }));
    } catch (e) {
      console.log("[BT] Erro ao listar dispositivos pareados:", e.message);
      return [];
    }
  }

  // ── Scan: abrir picker Bluetooth do navegador ──────────────────────
  async scanAndConnect() {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth não suportado. Use Chrome/Edge e acesse via HTTPS ou localhost.",
      );
    }

    console.log("[BT] Abrindo picker Bluetooth...");
    this.notifyStatus("scanning", "Buscando impressoras Bluetooth...");

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    return await this._connectToDevice(device);
  }

  // ── Conectar a um dispositivo já pareado ───────────────────────────
  async connectToSavedDevice(device) {
    if (device.gatt) {
      return await this._connectToDevice(device);
    }
    throw new Error("Dispositivo inválido.");
  }

  // ── Conectar a um device BLE genérico ──────────────────────────────
  async _connectToDevice(device) {
    const deviceName = device.name || "Impressora Desconhecida";
    console.log("[BT] Dispositivo selecionado:", deviceName, device.id);
    this.device = device;
    this.deviceName = deviceName;
    this.notifyStatus("connecting", `Conectando a ${deviceName}...`);

    device.addEventListener("gattserverdisconnected", () => {
      console.log("[BT] Dispositivo desconectado");
      this.characteristic = null;
      this.connectionType = null;
      this.notifyStatus("disconnected", "Impressora desconectada.");
    });

    // ── GATT connect com timeout ──
    let server;
    try {
      console.log(`[BT] Conectando ao GATT server (timeout ${GATT_CONNECT_TIMEOUT_MS / 1000}s)...`);
      server = await gattConnectWithTimeout(device, GATT_CONNECT_TIMEOUT_MS);
      console.log("[BT] Conectado ao GATT server");
    } catch (err) {
      this.device = null;
      this.connectionType = null;

      if (err.message === "TIMEOUT") {
        // Timeout = provavelmente dispositivo SPP (Bluetooth Classic)
        const msg =
          `A impressora "${deviceName}" não respondeu via BLE.\n\n` +
          `Isso acontece porque ela usa Bluetooth Clássico (SPP) — como a MPT-II.\n\n` +
          `Para conectar:\n` +
          `1. Pareie a impressora pelo sistema operacional\n` +
          `2. Use o botão "Conectar Serial (SPP)"\n\n` +
          `Ou pareie via sistema e use "Imprimir via Navegador".`;
        this.notifyStatus("error", msg);
        throw new Error(msg);
      }

      const msg = `Falha ao conectar com "${deviceName}": ${err.message}`;
      this.notifyStatus("error", msg);
      throw new Error(msg);
    }

    // ── Listar serviços BLE ──
    let service = null;
    let allServices = [];
    try {
      allServices = await server.getPrimaryServices();
      console.log("[BT] Serviços BLE:", allServices.length);
    } catch (e) {
      console.log("[BT] Não foi possível listar serviços:", e.message);
    }

    if (allServices.length > 0) {
      service =
        allServices.find((s) => PRINTER_SERVICES.includes(s.uuid)) ||
        allServices[0];
    }

    // Fallback manual
    if (!service) {
      for (const uuid of PRINTER_SERVICES) {
        try {
          service = await server.getPrimaryService(uuid);
          if (service) {
            console.log("[BT] Serviço encontrado:", uuid);
            break;
          }
        } catch {
          // ignora
        }
      }
    }

    if (!service) {
      const msg =
        `A impressora "${deviceName}" conectou, mas não expõe serviços BLE de impressão.\n\n` +
        `Ela provavelmente usa Bluetooth Clássico (SPP). Use "Conectar Serial (SPP)".`;
      this.notifyStatus("error", msg);
      this.device = null;
      throw new Error(msg);
    }

    // ── Buscar característica de escrita ──
    let characteristic = null;
    let allChars = [];
    try {
      allChars = await service.getCharacteristics();
    } catch (e) {
      console.log("[BT] Não foi possível listar características:", e.message);
    }

    if (allChars.length > 0) {
      characteristic =
        allChars.find((c) => c.properties.writeWithoutResponse) ||
        allChars.find((c) => c.properties.write) ||
        allChars[0];
    }

    if (!characteristic) {
      for (const uuid of PRINTER_CHARACTERISTICS) {
        try {
          characteristic = await service.getCharacteristic(uuid);
          if (characteristic) break;
        } catch {
          // ignora
        }
      }
    }

    if (!characteristic) {
      const msg = `Serviço encontrado, mas nenhuma característica de escrita em "${deviceName}".`;
      this.notifyStatus("error", msg);
      this.device = null;
      throw new Error(msg);
    }

    this.characteristic = characteristic;
    this.connectionType = "ble";
    console.log("[BT] Conexão BLE concluída com sucesso!");
    this.notifyStatus("connected", "Conectado via BLE!");
    return true;
  }

  // ── Conexão Serial (Web Serial API - Bluetooth Classic/SPP) ────────
  async connectSerial() {
    if (!navigator.serial) {
      throw new Error(
        "Web Serial API não suportada. Use Chrome/Edge no desktop.",
      );
    }

    console.log("[Serial] Solicitando porta serial...");
    this.notifyStatus("scanning", "Buscando porta serial...");

    const port = await navigator.serial.requestPort();

    console.log("[Serial] Porta selecionada, tentando abrir...");
    this.notifyStatus("connecting", "Conectando via Serial...");

    let opened = false;
    for (const baudRate of SERIAL_BAUD_RATES) {
      try {
        await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none" });
        console.log(`[Serial] Porta aberta com baud rate ${baudRate}`);
        opened = true;
        break;
      } catch (e) {
        console.log(`[Serial] Baud rate ${baudRate} falhou:`, e.message);
      }
    }

    if (!opened) {
      const msg =
        "Não foi possível abrir a porta serial.\n" +
        "Verifique se a impressora está pareada e ligada.";
      this.notifyStatus("error", msg);
      throw new Error(msg);
    }

    this.serialPort = port;
    this.deviceName = "Impressora Serial";
    this.connectionType = "serial";

    port.addEventListener("disconnect", () => {
      console.log("[Serial] Porta desconectada");
      this.serialPort = null;
      this.connectionType = null;
      this.notifyStatus("disconnected", "Porta serial desconectada.");
    });

    console.log("[Serial] Conexão serial concluída!");
    this.notifyStatus("connected", "Conectado via Serial (SPP)!");
    return true;
  }

  // ── Conexão unificada (BLE → Serial) ──────────────────────────────
  async connect() {
    try {
      return await this.scanAndConnect();
    } catch (bleErr) {
      console.log("[BT] Falha BLE:", bleErr.message);

      if (navigator.serial) {
        try {
          console.log("[BT] Tentando Serial como fallback...");
          return await this.connectSerial();
        } catch (serialErr) {
          console.log("[BT] Falha Serial:", serialErr.message);
          const combined = new Error(
            `Não foi possível conectar.\n` +
              `BLE: ${bleErr.message}\n` +
              `Serial: ${serialErr.message}`,
          );
          combined.cause = { ble: bleErr, serial: serialErr };
          throw combined;
        }
      }

      throw bleErr;
    }
  }

  // ── Desconectar ────────────────────────────────────────────────────
  async disconnect() {
    if (this.connectionType === "ble" && this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    if (this.connectionType === "serial" && this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {
        // ignora
      }
    }
    this.device = null;
    this.characteristic = null;
    this.serialPort = null;
    this.connectionType = null;
    this.notifyStatus("disconnected", "Desconectado.");
  }

  // ── Enviar dados de impressão ──────────────────────────────────────
  async print(uint8Array) {
    if (!this.isConnected()) {
      throw new Error("Impressora não conectada.");
    }

    this.notifyStatus("printing", "Imprimindo cupom...");

    try {
      if (this.connectionType === "ble") {
        await this._printBLE(uint8Array);
      } else if (this.connectionType === "serial") {
        await this._printSerial(uint8Array);
      }

      console.log("[Print] Impressão concluída!");
      this.notifyStatus("connected", "Impressão concluída!");
    } catch (err) {
      console.error("[Print] Erro:", err);
      this.notifyStatus("error", "Erro ao enviar dados de impressão.");
      throw err;
    }
  }

  async _printBLE(uint8Array) {
    const chunkSize = 512;
    const totalChunks = Math.ceil(uint8Array.length / chunkSize);
    console.log(`[BLE] Enviando ${uint8Array.length} bytes em ${totalChunks} chunks...`);

    const writeFn = this.characteristic.properties.writeWithoutResponse
      ? (chunk) => this.characteristic.writeValueWithoutResponse(chunk)
      : (chunk) => this.characteristic.writeValue(chunk);

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      console.log(`[BLE] Chunk ${chunkNum}/${totalChunks} (${chunk.length} bytes)`);
      await writeFn(chunk);
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  async _printSerial(uint8Array) {
    const writer = this.serialPort.writable.getWriter();
    try {
      const chunkSize = 4096;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        await writer.write(chunk);
      }
    } finally {
      writer.releaseLock();
    }
  }
}

// ── Exportações ──────────────────────────────────────────────────────

import { generateEscPosReceipt } from "./escPos";

export const isBluetoothSupported = () => {
  return (
    typeof navigator !== "undefined" &&
    ("bluetooth" in navigator || "serial" in navigator)
  );
};

export const isBLESupported = () => {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
};

export const isSerialSupported = () => {
  return typeof navigator !== "undefined" && "serial" in navigator;
};

export const printOrderBluetooth = async (order, settings) => {
  if (!isBluetoothSupported()) {
    throw new Error(
      "Nem Web Bluetooth nem Web Serial suportados. Use Chrome/Edge.",
    );
  }
  if (!bluetoothPrinter.isConnected()) {
    await bluetoothPrinter.connect();
  }
  const bytes = generateEscPosReceipt(order, order.items || [], settings);
  await bluetoothPrinter.print(bytes);
  return true;
};

export const bluetoothPrinter = new BluetoothPrinterService();
