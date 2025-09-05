"use client"

import type React from "react"

import { useState } from "react"
import { User, Phone, Mail, Building, Briefcase, CreditCard, MapPin, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// motion removed for performance

export default function EventCreationForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    organizerType: "",
    companyType: "",
    brandName: "",
    fiscalName: "",
    nif: "",
    fiscalAddress: "",
    postalCode: "",
    location: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Aqui você adicionaria a lógica para enviar os dados do formulário
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="flex justify-center mb-12">
        <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          T3cket
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 p-8 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent mb-4">
            Cria o teu primeiro evento
          </h1>
          <p className="text-gray-600 mb-3 max-w-2xl mx-auto">
            Preenche o formulário para abrir uma nova conta de organizador na plataforma e criarás o teu primeiro
            evento.
          </p>
          <p className="text-gray-600">
            Ainda tens dúvidas?
            <a
              href="#"
              className="text-indigo-600 ml-1 hover:text-purple-600 transition-colors font-medium hover:underline"
            >
              Vamos falar primeiro
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-white" />
              </span>
              Informações pessoais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome*
                </label>
                <div className="relative">
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  />
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telemóvel*
                </label>
                <div className="relative">
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  />
                  <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail*
              </label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
                <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                <Building className="h-4 w-4 text-white" />
              </span>
              Informações do organizador
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="organizerType" className="block text-sm font-medium text-gray-700">
                  Tipo de organizador*
                </label>
                <Select
                  onValueChange={(value) => handleSelectChange("organizerType", value)}
                  value={formData.organizerType}
                >
                  <SelectTrigger className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="association">Associação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="companyType" className="block text-sm font-medium text-gray-700">
                  Tipo de empresa*
                </label>
                <Select
                  onValueChange={(value) => handleSelectChange("companyType", value)}
                  value={formData.companyType}
                >
                  <SelectTrigger className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequena Empresa</SelectItem>
                    <SelectItem value="medium">Média Empresa</SelectItem>
                    <SelectItem value="large">Grande Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label htmlFor="brandName" className="block text-sm font-medium text-gray-700">
                Nome da marca*
              </label>
              <div className="relative">
                <Input
                  id="brandName"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
                <Briefcase className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label htmlFor="fiscalName" className="block text-sm font-medium text-gray-700">
                Nome fiscal completo*
              </label>
              <div className="relative">
                <Input
                  id="fiscalName"
                  name="fiscalName"
                  value={formData.fiscalName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
                <CreditCard className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label htmlFor="nif" className="block text-sm font-medium text-gray-700">
                NIF*
              </label>
              <div className="relative">
                <Input
                  id="nif"
                  name="nif"
                  value={formData.nif}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
                <Hash className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label htmlFor="fiscalAddress" className="block text-sm font-medium text-gray-700">
                Morada fiscal*
              </label>
              <div className="relative">
                <Input
                  id="fiscalAddress"
                  name="fiscalAddress"
                  value={formData.fiscalAddress}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
                <MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                  Código postal*
                </label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Localidade*
                </label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-6 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Continuar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

