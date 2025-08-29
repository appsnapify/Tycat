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

// ✅ FUNÇÃO: Validar campos obrigatórios (Complexidade: 5)
export function validateRequiredFields(formData: FormData): string[] {
  const errors: string[] = [];

  if (!formData.phone?.trim()) { // +1
    errors.push('Número de telemóvel é obrigatório');
  }

  if (!formData.firstName?.trim()) { // +1
    errors.push('Nome é obrigatório');
  }

  if (!formData.lastName?.trim()) { // +1
    errors.push('Apelido é obrigatório');
  }

  if (!formData.city?.trim()) { // +1
    errors.push('Cidade é obrigatória');
  }

  if (!formData.password?.trim()) { // +1
    errors.push('Password é obrigatória');
  }

  return errors;
}

// ✅ FUNÇÃO: Validar formato dos campos (Complexidade: 4)
export function validateFieldFormats(formData: FormData): string[] {
  const errors: string[] = [];

  if (formData.password && formData.password.length < 8) { // +1
    errors.push('Password deve ter pelo menos 8 caracteres');
  }

  if (formData.email && !isValidEmail(formData.email)) { // +1
    errors.push('Email inválido');
  }

  if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) { // +1
    errors.push('As passwords não coincidem');
  }

  return errors;
}

// ✅ FUNÇÃO: Validar email (Complexidade: 1)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ✅ FUNÇÃO: Validação completa (Complexidade: 2)
export function validateForm(formData: FormData): { isValid: boolean; errors: string[] } {
  const requiredErrors = validateRequiredFields(formData);
  const formatErrors = validateFieldFormats(formData);
  
  const allErrors = [...requiredErrors, ...formatErrors];
  
  return {
    isValid: allErrors.length === 0, // +1
    errors: allErrors
  };
}

// ✅ FUNÇÃO: Preparar dados para envio (Complexidade: 1)
export function prepareRegistrationData(formData: FormData) {
  return {
    phone: formData.phone,
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email || null,
    birth_date: formData.birthDate || null,
    gender: formData.gender || null,
    city: formData.city,
    password: formData.password,
    confirm_password: formData.confirmPassword
  };
}
