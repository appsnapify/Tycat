# 📦 BACKUP SISTEMA `/user` ORIGINAL

**Data Backup:** 2024-12-19  
**Motivo:** Substituição completa por novo sistema

## 📁 ESTRUTURA ORIGINAL

```
app/user/
├── layout.tsx                   ← Layout básico com ClienteAuthProvider
├── dashboard/
│   ├── page.tsx                 ← Dashboard com categorização eventos
│   ├── layout.tsx               ← Layout dashboard
│   └── profile/page.tsx         ← Página perfil
```

## 🔧 CARACTERÍSTICAS SISTEMA ORIGINAL

- **Hook usado:** `useClienteIsolado`
- **Design:** Fundo escuro com categorização eventos
- **Funcionalidades:** Próximos, Recentes, Passados eventos
- **APIs:** `/api/cliente-isolado/*`
- **Componentes:** `components/cliente-isolado/*`

## ⚠️ REFERÊNCIAS ENCONTRADAS

1. `components/client/GuestRequestClient.tsx` → `/user/dashboard`
2. `app/client/guestlist/page.tsx` → `/user/dashboard`  
3. `app/user/dashboard/profile/page.tsx` → `/user/dashboard/profile/edit`

## 🎯 SUBSTITUIÇÃO

Este sistema será **completamente substituído** pelo novo dashboard da imagem com:
- Wallet Section (Guest List + Bilhetes)
- Botões amarelos
- Design "Bem-vindo de volta"
- Sistema autenticação independente

---
**BACKUP COMPLETO - SEGURO PROCEDER COM SUBSTITUIÇÃO** 