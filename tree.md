# Estrutura do Projeto "snap"

Esta é uma representação da estrutura de diretórios e arquivos do projeto, baseada na exploração realizada.

/ (Raiz do Workspace: snap)
├── .assistantrules
├── .deepsource.toml
├── .env.example (Não listado pela ferramenta, visto na imagem, provavelmente no .gitignore)
├── .env.local (Não listado pela ferramenta, visto na imagem, provavelmente no .gitignore)
├── .gitignore
├── .git/ (...)
├── .next/ (...)
├── @/ (Geralmente um alias para src/ ou app/, verificar tsconfig.json)
├── app/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── aceitar-convite/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── organizador/
│   │   │   ├── convites/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── organizacoes/
│   │   │   │   ├── [orgId]/
│   │   │   │   │   ├── equipas/
│   │   │   │   │   │   └── [teamId]/
│   │   │   │   │   │       ├── layout.tsx
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── nova/
│   │   │   │       └── page.tsx
│   │   │   ├── (Não encontrado: definicoes/)
│   │   │   └── (Não encontrado: utilizadores/)
│   │   ├── layout.tsx
│   │   ├── page.tsx (Dashboard Principal?)
│   │   └── (Não encontrado: perfil/)
│   ├── components/
│   │   └── dashboard/  -- NOTA: Componentes com nomes duplicados em /components/dashboard/
│   │       ├── activity-feed.tsx
│   │       ├── team-code-display.tsx
│   │       └── team-members-list.tsx
│   └── (Não encontrado: api/)
├── changelog_organizador_equipes_page.md
├── components/  -- NOTA: Provavelmente os componentes principais/atuais
│   ├── dashboard/
│   │   ├── sidebar/
│   │   │   └── sidebar.tsx (vazio)
│   │   ├── activity-feed.tsx
│   │   ├── metric-card.tsx
│   │   ├── team-code-display.tsx
│   │   ├── team-header.tsx
│   │   └── team-members-list.tsx
│   ├── sections/
│   │   ├── Features.tsx (vazio)
│   │   ├── Footer.tsx (vazio)
│   │   └── Testimonials.tsx (vazio)
│   ├── ui/
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── event-card.tsx
│   │   ├── form.tsx
│   │   ├── heading.tsx
│   │   ├── hover-card.tsx
│   │   ├── input-otp.tsx
│   │   ├── input.tsx
│   │   ├── kpi-card.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toggle.tsx
│   │   ├── tooltip.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── country-select.tsx
│   ├── date-range-picker.tsx
│   ├── event-creation-form.tsx
│   ├── heading.tsx
│   ├── organization-preview.tsx
│   ├── organization-selector.tsx
│   ├── sidebar.tsx
│   ├── theme-provider.tsx
│   └── user-type-modal.tsx
├── components.json
├── contexts/ (?)
├── hooks/ (?)
├── lib/ (?)
├── mcp-server/ (?)
├── middleware.ts
├── miguel.md
├── miguelnovo.md
├── miguelnovo2.md
├── next-env.d.ts
├── next.config.js
├── next.config.mjs
├── node_modules/ (...)
├── package-lock.json
├── package.json
├── playwright.config.ts
├── porresolver.md
├── postcss.config.mjs
├── public/ (?)
├── README.md
├── resumex.md
├── resumo.md
├── scripts/ (?)
├── snap/
│   └── example.spec.ts
├── sql_columns.sql
├── sql_tables.sql
├── styles/ (?)
├── supabase/ (?)
├── tailwind.config.ts
├── teste1.md
├── Testes/ (?)
├── tests-examples/ (?)
├── todo.md
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── types/ (?)

Legenda:
- `(?)`: Diretório listado mas conteúdo não explorado em detalhe.
- `(...)`: Diretório conhecido por conter muitos arquivos (gerados, dependências, etc.).
- `(Não encontrado: ...)`: Tentativa de listar o diretório falhou (não existe).
- `NOTA:` Observações importantes sobre a estrutura. 