# omnixchannel
Site corporativo omnic channel.

🌐 Visão Geral 

O ConectXIP Cloud é uma landing page profissional desenvolvida com foco em empresas de tecnologia que oferecem soluções em: 

    ☁️ Cloud Computing
    🌐 Conectividade Empresarial
    🤖 Automações Inteligentes (WhatsApp, VoIP, RPA, Chatbots)
    📊 ROI Calculator integrado
     

O site é totalmente estático, leve, responsivo e otimizado para performance, SEO e experiência do usuário. 
Agora também conta com backend Node.js para persistência e gestão administrativa das integrações.
 
✅ Recursos 

    ✅ Design moderno com efeitos suaves (blur, gradientes, animações)
    ✅ Totalmente responsivo (mobile-first)
    ✅ Navegação suave com smooth scroll
    ✅ Animações ao rolar a página (scroll reveal)
    ✅ Calculadora de ROI interativa
    ✅ Formulário de contato funcional (frontend)
    ✅ Área de clientes para integração n8n + Evolution API
    ✅ Validações de segurança no onboarding (HTTPS, e-mail corporativo, padrão de tenant)
    ✅ Backend administrativo com persistência em Supabase
    ✅ Painel admin para sincronizar integrações via APIs/Webhooks
    ✅ Estatísticas animadas
    ✅ Pronto para deploy com Docker
    ✅ Arquitetura limpa e modular
    ✅ Acessibilidade básica e SEO-friendly
     

 

🚀 Tecnologias Utilizadas 
HTML5
	
Estrutura semântica
CSS3
	
Estilização com animações e responsividade
JavaScript (Vanilla)
	
Interações e lógica (sem frameworks)
Node.js + Express
	
API backend para cadastro, gestão administrativa e webhooks
Docker
	
Containerização para produção
Nginx
	
Servidor web leve e eficiente

🛡️ Segurança Aplicada

    ✅ Security headers em nível de servidor (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
    ✅ CSP restritiva para reduzir risco de XSS e carregamento indevido de conteúdo
    ✅ Integrações aceitam apenas endpoints HTTPS
    ✅ Recomendação de armazenamento de credenciais apenas em backend (Vault/KMS)
    ✅ Fluxo preparado para MFA, rotação de tokens e auditoria de acessos
    ✅ Token administrativo obrigatório para rotas de gestão
    ✅ Persistência de auditoria em tabela dedicada (`integration_events`)
 
 
 
🧱 Arquitetura do Projeto 
conectxip-cloud/
├── src/
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── images/ (opcional)
├── docker/
│   ├── Dockerfile
│   └── nginx.conf
├── .dockerignore
└── README.md

🐳 Como Executar com Docker 
1. Clone o repositório 
git clone https://github.com/seu-usuario/conectxip-cloud.git
cd conectxip-cloud

2. Construa a imagem Docker
docker build -t conectxip-cloud -f docker/Dockerfile .

3. Rode o container
docker run -d -p 80:80 --name conectxip-web conectxip-cloud

✅ O site estará disponível em: http://localhost  
 
🔧 Como Desenvolver Localmente 

    Clone o projeto
    Abra src/index.html no navegador
    Edite:
        src/assets/css/style.css para estilos
        src/assets/js/main.js para lógica
         
4.  Após alterações, recompile com Docker ou sirva localmente com:
     npx serve -s src

### Backend + Supabase (novo)

1. Copie variáveis de ambiente:

```bash
cp .env.example .env
```

2. Preencha no `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_API_TOKEN`
   - tokens compartilhados de n8n/evolution (opcional para sync segura)

3. Crie as tabelas/configurações no Supabase com:

```sql
-- executar conteúdo de supabase/schema.sql
```

O schema cria:
- `client_integrations` (cadastro principal de clientes/integrações)
- `integration_secrets` (segredos por provedor com vínculo ao cliente)
- `integration_sync_jobs` (histórico operacional de sincronizações)
- `integration_events` (auditoria de eventos/webhooks)
- índices de performance, triggers de `updated_at`, enums de status/segurança e políticas RLS com **deny-all** por padrão.

4. Instale e rode API:

```bash
npm install
npm run start
```

Principais rotas:

- `POST /api/clients` → cadastro/atualização de cliente com persistência.
- `GET /api/admin/clients` → listagem administrativa (header `x-admin-token`).
- `POST /api/admin/clients/:companyId/sync` → dispara integração para n8n + Evolution API.
- `POST /api/webhooks/n8n` e `POST /api/webhooks/evolution` → recebimento e auditoria de eventos.

     🚀 Deploy em Produção 
Opções recomendadas: 
VPS com Docker
	
docker run -d -p 80:80 --restart unless-stopped conectxip-cloud
Render.com
	
Conecte o repositório e aponte para
src/
Netlify / Vercel
	
Faça deploy estático da pasta
src/
AWS ECS / Fargate
	
Use a imagem Docker gerada

🛠️ Personalização 
1. Dados da Empresa 

Edite em index.html: 

    E-mails, telefones, endereços
    Textos, serviços, valores
    Cores (no CSS: --primary, --gradient)
     

2. Cores e Estilo 

Localize no CSS: 
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

Substitua pelas cores da sua marca. 
3. Adicionar Domínio 

Configure seu DNS para apontar ao servidor e use Nginx + Certbot para HTTPS. 
 
📊 ROI Calculator 

Ferramenta interativa que calcula: 

    Economia mensal com automação
    Retorno sobre investimento (ROI)
    Redução de custos com atendimento
     

🔧 Fórmulas baseadas em benchmarks reais: 

    70% de redução em custos de atendimento
    Custo médio de automação: R$ 2.000/mês
     

 
📎 Licença 

Este projeto está licenciado sob a MIT License – veja o arquivo LICENSE  para detalhes. 
 
📬 Contato 

    📧 contato@conectxip.cloud 
    📍 São Paulo, SP - Brasil
     

 
🌟 Agradecimentos 

Feito com ❤️ para empresas que querem inovar com tecnologia de ponta. 
