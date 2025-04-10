declare module 'html5-qrcode' {
  export class Html5Qrcode {
    static getCameras(): Promise<Array<{id: string, label: string}>>;
    static FORMATS: {
      QR_CODE: number;
      AZTEC: number;
      CODABAR: number;
      CODE_39: number;
      CODE_93: number;
      CODE_128: number;
      DATA_MATRIX: number;
      MAXICODE: number;
      ITF: number;
      EAN_13: number;
      EAN_8: number;
      PDF_417: number;
      RSS_14: number;
      RSS_EXPANDED: number;
      UPC_A: number;
      UPC_E: number;
      UPC_EAN_EXTENSION: number;
    };

    constructor(elementId: string, config?: any);

    start(
      cameraIdOrConfig: string | { 
        deviceId?: string; 
        facingMode?: string;
      },
      configuration?: {
        fps?: number;
        qrbox?: number | { width: number; height: number };
        aspectRatio?: number;
        disableFlip?: boolean;
        formatsToSupport?: number[];
        experimentalFeatures?: {
          useBarCodeDetectorIfSupported?: boolean;
        };
        rememberLastUsedCamera?: boolean;
        showTorchButtonIfSupported?: boolean;
        showZoomSliderIfSupported?: boolean;
      },
      qrCodeSuccessCallback?: (decodedText: string, decodedResult: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error: any) => void
    ): Promise<void>;

    stop(): Promise<void>;

    clear(): void;

    readonly isScanning: boolean;
    
    scanFile(file: File | Blob, showImage?: boolean): Promise<string>;
    
    scanFileV2(file: File | Blob, showImage?: boolean): Promise<{
      decodedText: string; 
      result: {
        format: any; 
        formatName: string; 
        rawBytes: Uint8Array;
      }
    }>;
  }
} 