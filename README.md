# CD2 Open

Tudo que a CD2 oferece de graça para quem faz varejo, num endereço só: [open.cd2.com.br](https://open.cd2.com.br).

## Como adicionar um recurso

1. Crie `catalog/<tipo>/<slug>.yaml`, usando uma entrada existente como modelo.
2. O `slug` é igual ao nome do arquivo, em português e com hífen, e não muda depois.
3. O campo `type` é igual ao nome da pasta.
4. Use uma das licenças aceitas em `catalog/schema.json` e nunca apresente como aberto o que é fechado.
5. Se tiver um print do recurso em uso, coloque em `public/prints/<slug>.webp`, com 1600 px de largura e só dados fictícios, rode `npm run thumbs` para gerar a miniatura do card e preencha o campo `preview`.
6. Rode `npm run validate`.
7. Abra o pull request. O CI confere de novo.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Publicação

Cada push na `main` publica no Cloudflare Pages, projeto `cd2-open`. O repositório precisa dos secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.

Licença do código: Apache 2.0. A fonte Manrope é SIL Open Font License 1.1. A marca e os logos da CD2 têm todos os direitos reservados.
