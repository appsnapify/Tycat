import QRCode from 'qrcode';
import { LRUCache } from 'lru-cache';
import { createHash, createHmac, randomBytes } from 'crypto';
import { createCanvas, Canvas } from 'canvas';

// Configuração do cache
const qrCache = new LRUCache<string, string>({
  max: 1000, // Máximo de QR codes em cache
  ttl: 1000 * 60 * 60, // 1 hora de TTL
});

// Interface para dados do QR Code
interface QRCodeData {
  guestId: string;
  eventId: string;
  timestamp: number;
  nonce: string;
}

// Interface para QR Code assinado
interface SignedQRCodeData extends QRCodeData {
  signature: string;
  version: number;
}

class QRCodeService {
  private static instance: QRCodeService;
  private readonly SECRET_KEY: string;
  private readonly FALLBACK_SERVICES: string[];
  
  private constructor() {
    // Usar uma chave secreta do ambiente ou gerar uma se não existir
    this.SECRET_KEY = process.env.QR_SIGNING_SECRET || this.generateSecretKey();
    
    // Serviços de fallback em ordem de preferência
    this.FALLBACK_SERVICES = [
      'https://api.qrserver.com/v1/create-qr-code/',
      'https://chart.googleapis.com/chart?cht=qr',
      // Adicionar mais serviços de fallback se necessário
    ];
  }

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  private generateSecretKey(): string {
    return randomBytes(32).toString('hex');
  }

  private async generateSignature(data: QRCodeData): Promise<string> {
    const hmac = createHmac('sha256', this.SECRET_KEY);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  private async createQRCodeLocally(data: string): Promise<string> {
    try {
      // Tentar gerar QR code como data URL
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 250,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Erro na geração local do QR code:', error);
      
      // Tentar gerar usando canvas como fallback
      const canvas = createCanvas(250, 250);
      await QRCode.toCanvas(canvas, data, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 250
      });
      return canvas.toDataURL();
    }
  }

  private async tryFallbackServices(data: string): Promise<string> {
    for (const serviceUrl of this.FALLBACK_SERVICES) {
      try {
        const url = `${serviceUrl}?size=250x250&data=${encodeURIComponent(data)}`;
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          return url;
        }
      } catch (error) {
        console.error(`Erro no serviço de fallback ${serviceUrl}:`, error);
        continue;
      }
    }
    throw new Error('Todos os serviços de fallback falharam');
  }

  public async generateQRCode(
    guestId: string,
    eventId: string
  ): Promise<{ qrCodeUrl: string; qrCodeData: string }> {
    // Gerar dados do QR code
    const qrData: QRCodeData = {
      guestId,
      eventId,
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex')
    };

    // Gerar assinatura
    const signature = await this.generateSignature(qrData);

    // Criar dados assinados
    const signedData: SignedQRCodeData = {
      ...qrData,
      signature,
      version: 1
    };

    // Converter para string
    const qrCodeString = JSON.stringify(signedData);

    // Verificar cache
    const cacheKey = createHash('sha256').update(qrCodeString).digest('hex');
    const cachedQR = qrCache.get(cacheKey);
    if (cachedQR) {
      return {
        qrCodeUrl: cachedQR,
        qrCodeData: qrCodeString
      };
    }

    try {
      // Tentar geração local primeiro
      const qrCodeUrl = await this.createQRCodeLocally(qrCodeString);
      qrCache.set(cacheKey, qrCodeUrl);
      return { qrCodeUrl, qrCodeData: qrCodeString };
    } catch (error) {
      console.error('Erro na geração local, tentando fallbacks:', error);
      
      try {
        // Tentar serviços de fallback
        const fallbackUrl = await this.tryFallbackServices(qrCodeString);
        qrCache.set(cacheKey, fallbackUrl);
        return { qrCodeUrl: fallbackUrl, qrCodeData: qrCodeString };
      } catch (fallbackError) {
        console.error('Todos os métodos de geração falharam:', fallbackError);
        throw new Error('Não foi possível gerar o QR code');
      }
    }
  }

  public async validateQRCode(qrCodeData: string): Promise<boolean> {
    try {
      const data = JSON.parse(qrCodeData) as SignedQRCodeData;
      
      // Verificar versão
      if (data.version !== 1) {
        return false;
      }

      // Verificar validade temporal (24 horas)
      const age = Date.now() - data.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        return false;
      }

      // Verificar assinatura
      const { signature, ...verificationData } = data;
      const expectedSignature = await this.generateSignature(verificationData);
      
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}

export const qrCodeService = QRCodeService.getInstance(); 