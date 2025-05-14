'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { checkClientPhone, registerClient } from '@/app/cliente/actions'

export default function ClientRegistrationForm() {
  const [formData, setFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [errors, setErrors] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    form: ''
  })
  
  const [isCheckingPhone, setIsCheckingPhone] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Atualizar o estado do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpar erros ao digitar
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }
  
  // Verificar telefone antes de prosseguir
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar telefone
    if (!formData.phone || formData.phone.length < 10) {
      setErrors(prev => ({
        ...prev,
        phone: 'Digite um telefone válido'
      }))
      return
    }
    
    setIsCheckingPhone(true)
    
    try {
      const result = await checkClientPhone(formData.phone)
      
      if (result.success) {
        if (result.exists) {
          setErrors(prev => ({
            ...prev,
            phone: 'Este telefone já está cadastrado'
          }))
        } else {
          // Telefone disponível
          setPhoneVerified(true)
        }
      } else {
        setErrors(prev => ({
          ...prev,
          phone: result.error || 'Erro ao verificar telefone'
        }))
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        phone: 'Erro ao verificar telefone'
      }))
    } finally {
      setIsCheckingPhone(false)
    }
  }
  
  // Submeter o formulário completo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar dados
    let hasErrors = false
    const newErrors = { ...errors }
    
    if (!formData.firstName) {
      newErrors.firstName = 'Nome é obrigatório'
      hasErrors = true
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória'
      hasErrors = true
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres'
      hasErrors = true
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem'
      hasErrors = true
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
      hasErrors = true
    }
    
    if (hasErrors) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    setErrors(prev => ({ ...prev, form: '' }))
    
    try {
      // Criar FormData para a server action
      const serverFormData = new FormData()
      serverFormData.append('phone', formData.phone)
      serverFormData.append('firstName', formData.firstName)
      serverFormData.append('lastName', formData.lastName)
      serverFormData.append('email', formData.email)
      serverFormData.append('password', formData.password)
      
      // Chamar server action de registro
      const result = await registerClient(serverFormData)
      
      if (!result.success) {
        setErrors(prev => ({
          ...prev,
          form: result.error || 'Erro ao registrar'
        }))
      }
      // Em caso de sucesso, a server action fará o redirecionamento
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        form: 'Erro ao processar registro'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Reset do formulário
  const handleReset = () => {
    setPhoneVerified(false)
  }
  
  return (
    <div className="cliente-registration-form">
      {!phoneVerified ? (
        // Etapa 1: Verificar telefone
        <form onSubmit={handleCheckPhone} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Seu Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Digite seu telefone"
              value={formData.phone}
              onChange={handleChange}
              className="rounded-xl"
            />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-3 h-auto"
            disabled={isCheckingPhone}
          >
            {isCheckingPhone ? 'Verificando...' : 'Continuar'}
          </Button>
        </form>
      ) : (
        // Etapa 2: Completar registro
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome*</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Seu nome"
                value={formData.firstName}
                onChange={handleChange}
                className="rounded-xl"
              />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Seu sobrenome"
                value={formData.lastName}
                onChange={handleChange}
                className="rounded-xl"
              />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              className="rounded-xl"
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha*</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Crie uma senha"
              value={formData.password}
              onChange={handleChange}
              className="rounded-xl"
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha*</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirme sua senha"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="rounded-xl"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
          </div>
          
          {errors.form && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {errors.form}
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-3 h-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Criar Conta'}
            </Button>
            
            <button 
              type="button" 
              onClick={handleReset}
              className="text-sm text-blue-500 hover:underline"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </div>
  )
} 