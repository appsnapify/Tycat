'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Phone, User, Mail, Calendar, MapPin } from 'lucide-react';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import PhoneInput from 'react-phone-number-input';

interface FormData {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  gender: 'M' | 'F' | 'O' | '';
  city: string;
  password: string;
  confirmPassword: string;
}

interface RegistrationFormFieldsProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string) => void;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
}

// ✅ COMPONENTE: Personal Info Fields (Complexidade: 1)
export function PersonalInfoFields({ formData, onFieldChange }: { 
  formData: FormData; 
  onFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          <User className="w-4 h-4 inline mr-2" />
          Nome *
        </label>
        <Input
          type="text"
          placeholder="João"
          value={formData.firstName}
          onChange={(e) => onFieldChange('firstName', e.target.value)}
          className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          <User className="w-4 h-4 inline mr-2" />
          Apelido *
        </label>
        <Input
          type="text"
          placeholder="Silva"
          value={formData.lastName}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
          className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}

// ✅ COMPONENTE: Contact Fields (Complexidade: 1)
export function ContactFields({ formData, onFieldChange }: { 
  formData: FormData; 
  onFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          <Phone className="w-4 h-4 inline mr-2" />
          Telemóvel *
        </label>
        <div className="phone-input-white">
          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry="PT"
            value={formData.phone}
            onChange={(value) => onFieldChange('phone', value || '')}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          <Mail className="w-4 h-4 inline mr-2" />
          Email (opcional)
        </label>
        <Input
          type="email"
          placeholder="joao@exemplo.com"
          value={formData.email}
          onChange={(e) => onFieldChange('email', e.target.value)}
          className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>
    </>
  );
}

// ✅ COMPONENTE: Additional Info Fields (Complexidade: 1)
export function AdditionalInfoFields({ formData, onFieldChange }: { 
  formData: FormData; 
  onFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          <Calendar className="w-4 h-4 inline mr-2" />
          Data de Nascimento (opcional)
        </label>
        <Input
          type="date"
          value={formData.birthDate}
          onChange={(e) => onFieldChange('birthDate', e.target.value)}
          className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Género (opcional)
        </label>
        <select
          value={formData.gender}
          onChange={(e) => onFieldChange('gender', e.target.value as 'M' | 'F' | 'O' | '')}
          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        >
          <option value="">Selecionar</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
          <option value="O">Outro</option>
        </select>
      </div>
    </div>
  );
}

// ✅ COMPONENTE: Password Fields (Complexidade: 1)
export function PasswordFields({ 
  formData, 
  onFieldChange, 
  showPassword, 
  showConfirmPassword, 
  onTogglePassword, 
  onToggleConfirmPassword 
}: RegistrationFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Password *
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChange={(e) => onFieldChange('password', e.target.value)}
            className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onTogglePassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-slate-400" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Confirmar Password *
        </label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repetir password"
            value={formData.confirmPassword}
            onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
            className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onToggleConfirmPassword}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-slate-400" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPONENTE: City Field (Complexidade: 1)  
export function CityField({ formData, onFieldChange }: { 
  formData: FormData; 
  onFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        <MapPin className="w-4 h-4 inline mr-2" />
        Cidade *
      </label>
      <CityAutocomplete
        value={formData.city}
        onChange={(value) => onFieldChange('city', value)}
        placeholder="Começar a escrever o nome da cidade..."
        className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
      />
    </div>
  );
}
