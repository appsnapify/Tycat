# API Route: /api/profile

Este endpoint fornece informações completas do perfil de um usuário autenticado,
incluindo detalhes da equipe e do promotor, utilizando uma função RPC segura
que contorna problemas de RLS.

## Exemplo de Resposta

```json
{
  "user": {
    "id": "ab73d128-c997-4858-a47c-95d1403117ac",
    "email": "usuario@exemplo.com",
    "role": "chefe-equipe",
    "full_name": "Nome Completo",
    "avatar_url": "https://example.com/avatar.jpg",
    "team_id": "c7e59d45-c2d9-4990-a38c-61cd0c630cdf",
    "team_code": "TEAM-A1B2C",
    "team_name": "Minha Equipe"
  },
  "team": {
    "id": "c7e59d45-c2d9-4990-a38c-61cd0c630cdf",
    "name": "Minha Equipe",
    "description": "Descrição da equipe",
    "team_code": "TEAM-A1B2C",
    "member_count": 5,
    "events_count": 2,
    "sales_count": 10,
    "sales_total": 500
  },
  "has_team": true,
  "is_team_leader": true
}
```

## Importante

Esta API requer autenticação. Certifique-se de incluir o cookie de sessão Supabase nas solicitações.

## Status Codes

- `200`: Sucesso
- `401`: Não autenticado
- `404`: Perfil não encontrado
- `500`: Erro interno do servidor
