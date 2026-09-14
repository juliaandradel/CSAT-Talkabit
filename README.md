# CSAT — Talk a Bit

Site estático (HTML/CSS/JS puro, sem build) com o formulário de satisfação
do evento, identidade visual do Talk a Bit e respostas salvas no Supabase.
Qualquer pessoa pode responder — sem precisar de login.

## Arquivos

```
index.html            página do formulário (público, sem login)
dashboard.html         painel com as respostas agregadas (protegido por login)
styles.css             estilos compartilhados (tema escuro, identidade Talk a Bit)
dashboard.css           estilos específicos do dashboard
script.js               sliders, lógica condicional do hackathon, envio
dashboard.js            login, agregação dos dados e gráficos do dashboard
brands.js               lista única das marcas parceiras (usada no form e no dashboard)
speakers.js             lista única dos talks/momentos do cronograma (pergunta "talk mais marcante")
config.js               onde você cola a URL e a chave do Supabase
supabase-schema.sql     schema da tabela + regras de segurança (RLS)
assets/logo-badge.png              logo circular usada como favicon
assets/talkabit-lockup-purple.png  logo oficial usada no topo do formulário
assets/fonts/                      fonte oficial do evento (NB Architekt Std)
```

## 1. Criar o projeto no Supabase (gratuito)

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. No menu lateral, abra **SQL Editor** → **New query**, cole o conteúdo de
   `supabase-schema.sql` e rode. Isso cria a tabela `csat_responses` e as
   regras de segurança: qualquer pessoa pode *enviar* uma resposta, mas
   ninguém consegue *ler* as respostas de outra pessoa pelo site — só você,
   pelo painel do Supabase.
3. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Conectar o site ao Supabase

Abra `config.js` e cole os dois valores:

```js
window.SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
window.SUPABASE_ANON_KEY = "sua-chave-anon-aqui";
```

Sem isso preenchido, o formulário funciona normalmente na tela, mas ao
enviar mostra um aviso pedindo pra configurar — nenhuma resposta se perde
por engano em um Supabase mal configurado.

## 3. Subir para o GitHub

```bash
cd talk-a-bit-csat
git init
git add .
git commit -m "CSAT do Talk a Bit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/talk-a-bit-csat.git
git push -u origin main
```

(troque `SEU-USUARIO` pelo seu usuário/organização do GitHub — crie o
repositório vazio antes, em github.com/new)

## 4. Publicar o site

Qualquer uma destas opções funciona bem, sem custo:

- **GitHub Pages**: no repositório, vá em *Settings → Pages*, escolha a
  branch `main` e pasta `/ (root)`. Em alguns minutos o site fica no ar em
  `https://SEU-USUARIO.github.io/talk-a-bit-csat/`.
- **Vercel** ou **Netlify**: importe o repositório do GitHub direto pelo
  site deles (login com GitHub → "Import project") — detectam que é um
  site estático automaticamente, sem configuração extra.

## 5. Ver as respostas

Duas formas:

- **Rápido, sem preparo**: painel do Supabase → **Table Editor →
  csat_responses**. Dá pra ordenar, filtrar e exportar tudo em CSV por lá.
- **Dashboard pronto** (`dashboard.html`): NPS médio e score, detrator/
  neutro/promotor, médias de experiência/conteúdo/estrutura, participação
  e nota do hackathon por trilha, uma tabela por marca parceira (quem já
  conhecia vs. quem descobriu/se interessou depois — a base pronta pra
  levar pro patrocinador) e as respostas abertas (talks marcantes,
  sugestões). Tem botão de **Exportar CSV** também.

### Criar o login do dashboard

O dashboard fica protegido — ninguém enxerga as respostas sem entrar com
login e senha:

1. No Supabase, vá em **Authentication → Users → Add user**.
2. Crie um usuário com seu e-mail e uma senha (pode criar um pra cada
   pessoa da equipe que for acompanhar).
3. Abra `dashboard.html` (mesmo domínio do site, ex:
   `https://SEU-USUARIO.github.io/talk-a-bit-csat/dashboard.html`) e entre
   com esse e-mail/senha.

Isso funciona porque o `supabase-schema.sql` já cria uma regra dizendo
"só quem está autenticado pode *ler* as respostas" — quem preenche o
formulário nunca precisa de login (só grava), e ninguém de fora acessa o
dashboard sem essa conta. Se você já tinha rodado uma versão mais antiga
do schema, rode só esta parte no SQL Editor pra atualizar:

```sql
drop policy if exists "csat_select_autenticado" on csat_responses;
create policy "csat_select_autenticado"
  on csat_responses
  for select
  to authenticated
  using (true);
```

### Removendo a opção "Ambos" do hackathon (se você já rodou o schema antigo)

Como não dá pra participar dos dois hackathons ao mesmo tempo, o formulário
só oferece **Não / Acaso / Sieg**. Se você já rodou uma versão anterior do
`supabase-schema.sql` (que ainda permitia "Ambos"), rode isto no **SQL
Editor** pra atualizar a trava do banco:

```sql
alter table csat_responses drop constraint if exists csat_responses_participou_hackathon_check;
alter table csat_responses
  add constraint csat_responses_participou_hackathon_check
  check (participou_hackathon in ('Não', 'Acaso', 'Sieg'));
```

(Se alguma resposta antiga tiver ficado gravada como "Ambos" antes dessa
mudança, ela continua no banco normalmente — a trava só vale pras
respostas novas.)

## Personalizações rápidas

- **Cores e fonte**: tudo centralizado no topo de `styles.css`, no bloco
  `:root` (o dashboard usa os mesmos tokens). A paleta (`--purple`,
  `--purple-deep` etc.) e a fonte (`nbarchitekt`, arquivos em
  `assets/fonts/`) são as mesmas do site oficial do Talk a Bit.
- **Logo**: `assets/talkabit-lockup-purple.png` é o lockup oficial do
  evento, usado no topo do formulário.
- **Marcas parceiras**: a lista única está em `brands.js` — usada tanto
  nas chips do formulário quanto na tabela do dashboard. Adicione, remova
  ou renomeie só ali.
- **"Qual talk ou momento mais te marcou?"**: pergunta fechada com os
  talks e momentos do cronograma real dos três dias (inclusive os blocos
  de hackathon e a ativação Red Bull do dia 2), mais a opção "Outro" (que
  abre um campo de texto livre). A lista está em `speakers.js` — edite só
  ali se a programação mudar. O dashboard já mostra um ranking por
  talk/momento, e o texto livre de quem escolheu "Outro" aparece na lista
  logo abaixo.
