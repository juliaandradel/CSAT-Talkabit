// ---------------------------------------------------------------
// Talk a Bit — CSAT — configuração do Supabase
// ---------------------------------------------------------------
// 1. Crie um projeto gratuito em https://supabase.com
// 2. Rode o arquivo supabase-schema.sql no SQL Editor do projeto
// 3. Vá em Project Settings > API e copie:
//      - "Project URL"        -> cole em SUPABASE_URL
//      - "anon public" key    -> cole em SUPABASE_ANON_KEY
//    (a anon key é pública por design no Supabase; a segurança vem
//    das políticas de RLS definidas no supabase-schema.sql, que só
//    permitem INSERT, nunca leitura, para quem preenche o forms)
// ---------------------------------------------------------------

window.SUPABASE_URL = "COLE_AQUI_A_PROJECT_URL";
window.SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_PUBLIC_KEY";
