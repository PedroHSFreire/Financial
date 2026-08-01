# Financial Manager

Projeto financeiro em Next.js para uso pessoal, com duas áreas separadas:

- `/pessoal` para gestão pessoal
- `/empresarial` para gestão empresarial

## O que o app faz

- Cadastro de despesas fixas
- Cadastro de compras parceladas com mês inicial e final
- Marcação de pagamento por mês
- Filtros por tipo, status, categoria e busca
- Resumo de saldo, previsto, pago, pendente e atrasado
- Backup em JSON pelo navegador

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Build de produção

```bash
npm run build
npm run start
```

## Deploy na Vercel

1. Suba este repositório no GitHub.
2. Importe o projeto na Vercel.
3. Mantenha o preset como Next.js.
4. Use os comandos padrão:
   - Build: `npm run build`
   - Start: `npm run start`

## Observação sobre persistência

O app salva os dados no navegador via `localStorage`, então funciona bem para uso individual.
Há também uma rota de API para backup, mas em ambiente serverless como Vercel o armazenamento do servidor não deve ser tratado como persistente.
