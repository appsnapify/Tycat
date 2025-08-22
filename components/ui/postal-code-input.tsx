'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';

interface PostalCodeInputProps {
  value: string;
  onChange: (value: string, city: string | null) => void;
  onValidation?: (isValid: boolean, city: string | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PostalCodeInput: React.FC<PostalCodeInputProps> = ({
  value,
  onChange,
  onValidation,
  placeholder = "1234-567",
  label = "Código Postal",
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    city: string | null;
    error: string | null;
  }>({
    isValid: false,
    city: null,
    error: null
  });

  // ✅ DEBOUNCE PARA VALIDAÇÃO
  useEffect(() => {
    if (!value || value.length < 8) {
      setValidationState({ isValid: false, city: null, error: null });
      onValidation?.(false, null);
      return;
    }

    const timeoutId = setTimeout(() => {
      validatePostalCode(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, onValidation]);

  // ✅ FUNÇÃO AUXILIAR: Criar payload da requisição
  const createValidationPayload = (code: string) => ({ postal_code: code });

  // ✅ FUNÇÃO AUXILIAR: Processar resposta válida
  const processValidResponse = (data: any) => {
    const { valid, city, error } = data;
    setValidationState({
      isValid: valid,
      city: city || null,
      error: error || null
    });
    onValidation?.(valid, city || null);
  };

  // ✅ FUNÇÃO AUXILIAR: Processar erro
  const processError = (errorMessage: string) => {
    setValidationState({
      isValid: false,
      city: null,
      error: errorMessage
    });
    onValidation?.(false, null);
  };

  // ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 9 → <8)
  const validatePostalCode = async (code: string) => {
    setIsValidating(true);
    
    try {
      const response = await fetch('/api/postal-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createValidationPayload(code)),
      });

      const result = await response.json();

      if (result.success && result.data) {
        processValidResponse(result.data);
      } else {
        processError(result.error || 'Erro na validação');
      }
    } catch (error) {
      console.error('Erro na validação do código postal:', error);
      processError('Erro de conexão');
    } finally {
      setIsValidating(false);
    }
  };

  // ✅ FORMATAÇÃO AUTOMÁTICA DO INPUT
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9]/g, ''); // Só números
    
    // Formatar como XXXX-XXX
    if (input.length > 4) {
      input = `${input.slice(0, 4)}-${input.slice(4, 7)}`;
    }
    
    onChange(input, validationState.city);
  };

  // ✅ ÍCONE DE STATUS
  const getStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (value && value.length >= 8) {
      if (validationState.isValid) {
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      } else {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      }
    }
    
    return null;
  };

  // ✅ COR DA BORDA BASEADA NO STATUS
  const getBorderColor = () => {
    if (!value || value.length < 8) return '';
    
    if (isValidating) return 'border-blue-300';
    if (validationState.isValid) return 'border-green-500';
    if (validationState.error) return 'border-red-500';
    
    return '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* LABEL */}
      <Label htmlFor="postal-code" className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* INPUT COM ÍCONE */}
      <div className="relative">
        <Input
          id="postal-code"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          maxLength={8}
          className={`pr-10 ${getBorderColor()}`}
        />
        
        {/* ÍCONE DE STATUS */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {getStatusIcon()}
        </div>
      </div>

      {/* FEEDBACK DE VALIDAÇÃO */}
      {value && value.length >= 8 && (
        <div className="space-y-1">
          {/* CIDADE DETECTADA */}
          {validationState.isValid && validationState.city && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <MapPin className="w-3 h-3" />
              <span>Cidade: <strong>{validationState.city}</strong></span>
            </div>
          )}

          {/* ERRO DE VALIDAÇÃO */}
          {validationState.error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span>{validationState.error}</span>
            </div>
          )}

          {/* VALIDANDO */}
          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Validando código postal...</span>
            </div>
          )}
        </div>
      )}

      {/* HINT PARA FORMATO */}
      {(!value || value.length < 4) && (
        <p className="text-xs text-gray-500">
          Formato: 1234-567 (código postal português)
        </p>
      )}
    </div>
  );
}; 