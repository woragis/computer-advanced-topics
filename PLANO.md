# Plano de conserto — FakeRadar

Documento de referência para ir corrigindo e conectando todas as partes do projeto ao longo do tempo.

**Última revisão:** 2025-06-02  
**Objetivo final:** subir backend, AI, logging worker e frontend conectados, com fluxo completo de análise de fake news.

---

## Visão geral do estado atual

| Componente       | Porta  | Situação                                      |
|------------------|--------|-----------------------------------------------|
| PostgreSQL       | 5432   | OK no `docker-compose.yml`                    |
| RabbitMQ         | 5672   | OK no `docker-compose.yml`                    |
| Backend (API)    | 8080   | Código pronto; depende do AI e do Postgres    |
| AI (FastAPI)     | 8000   | Build Docker quebrado; precisa de API keys    |
| Logging worker   | —      | Consumer pronto; ninguém publica na fila      |
| Frontend (Vite)  | 5173   | Template padrão; não conectado ao backend     |

### Fluxo desejado

```
Frontend → Backend → AI → (resposta)
                ↓         ↓
           PostgreSQL   RabbitMQ → Logging worker → arquivos .log
```

---

## Fase 0 — Preparação do ambiente

**Prioridade:** alta  
**Esforço estimado:** ~30 min  
**Depende de:** nada

### Tarefas

- [ ] Instalar Docker Desktop e garantir que `docker compose` funciona
- [ ] Criar `.env` na raiz do projeto (`projeto/.env`) com as variáveis usadas pelo compose:

  ```env
  LLM_PROVIDER=anthropic
  LLM_API_KEY=sua-chave-anthropic
  FACT_CHECK_API_KEY=sua-chave-google-factcheck
  SERPER_API_KEY=sua-chave-serper
  MAIN_SERVER_SECRET=um-segredo-compartilhado
  ```

- [ ] Copiar `.env.example` de cada serviço para `.env` local (desenvolvimento fora do Docker):
  - `backend/.env`
  - `ai/.env`
  - `logging-worker/.env`
- [ ] Documentar no README raiz como obter cada API key (links oficiais)
- [ ] Verificar se a porta 5432 não está ocupada por outro Postgres local

### Critério de conclusão

- Arquivos `.env` existem e estão preenchidos (ou com placeholders claros)
- `docker compose config` roda sem erro

---

## Fase 1 — Corrigir build do serviço AI

**Prioridade:** crítica (bloqueia todo o stack)  
**Esforço estimado:** 1–2 h  
**Depende de:** Fase 0

### Problema

Conflito de dependências no `pip install`:

- `spacy==3.7.4` exige `typer < 0.10`
- `fastapi==0.111.0` puxa `fastapi-cli`, que exige `typer >= 0.16`

Além disso, o build copia ~400 MB de contexto (provavelmente `.venv` incluído).

### Tarefas

- [ ] Criar `ai/.dockerignore`:

  ```
  .venv
  __pycache__
  .pytest_cache
  .env
  *.pyc
  .git
  ```

- [ ] Resolver conflito de dependências — escolher **uma** abordagem:

  **Opção A (recomendada):** atualizar spaCy para versão compatível com typer recente

  ```txt
  spacy>=3.8.0
  fastapi==0.111.0
  ```

  **Opção B:** fixar FastAPI em versão mais antiga sem `fastapi-cli` conflitante

  **Opção C:** instalar spaCy e fastapi em etapas separadas no Dockerfile com pins explícitos de `typer`

- [ ] Testar build isolado: `docker compose build ai`
- [ ] Testar startup: `docker compose up ai` e acessar `http://localhost:8000/ai/health`
- [ ] Rodar testes locais: `cd ai && pytest`

### Critério de conclusão

- `docker compose build ai` conclui sem erro
- `GET /ai/health` retorna 200

---

## Fase 2 — Subir infraestrutura base (Postgres + RabbitMQ + Backend)

**Prioridade:** alta  
**Esforço estimado:** 1 h  
**Depende de:** Fase 1 (ou rodar backend sem AI temporariamente)

### Tarefas

- [ ] Subir apenas infra: `docker compose up postgres rabbitmq -d`
- [ ] Validar Postgres: `docker compose exec postgres pg_isready -U fakeradar_user -d fakeradar`
- [ ] Validar RabbitMQ: abrir `http://localhost:15672` (user `fakeradar`, pass `yourpassword`)
- [ ] Build e subir API: `docker compose up api -d`
- [ ] Confirmar migração Prisma (`prisma db push` roda no CMD do Dockerfile)
- [ ] Testar health: `curl http://localhost:8080/health`
- [ ] Testar auth:
  - `POST /api/auth/register` com email/senha
  - `POST /api/auth/login` → receber JWT
  - `GET /api/users/me` com header `Authorization: Bearer <token>`

### Critério de conclusão

- Backend responde em `:8080`
- Registro e login funcionam
- Banco persiste dados entre restarts do container

---

## Fase 3 — Conectar Backend ↔ AI

**Prioridade:** alta  
**Esforço estimado:** 1–2 h  
**Depende de:** Fases 1 e 2

### Tarefas

- [ ] Subir AI junto: `docker compose up ai api -d`
- [ ] Confirmar variável `AI_SERVER_URL=http://ai:8000` no serviço `api` (já está no compose)
- [ ] Testar AI isolado com texto simples:

  ```bash
  curl -X POST http://localhost:8000/ai/analyze \
    -H "Content-Type: application/json" \
    -d '{"text": "The Eiffel Tower is located in Paris, France."}'
  ```

- [ ] Testar fluxo completo via backend (com JWT):

  ```bash
  curl -X POST http://localhost:8080/api/analyses \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"inputText": "The Eiffel Tower is located in Paris, France."}'
  ```

- [ ] Tratar edge cases se necessário:
  - Resposta do LLM fora do JSON esperado (`credibility_scorer.py`)
  - `LLM_API_KEY` ausente → erro claro na startup ou no endpoint
  - Timeout na chamada AI → backend retorna 502 (já parcialmente implementado)

### Critério de conclusão

- `POST /api/analyses` persiste análise no Postgres com claims e verdict
- `GET /api/analyses` e `GET /api/analyses/:id` retornam o resultado

---

## Fase 4 — Conectar Logging worker (RabbitMQ)

**Prioridade:** média  
**Esforço estimado:** 2–3 h  
**Depende de:** Fase 2 (RabbitMQ no ar)

### Problema

O `logging-worker` consome a fila `fakeradar.logs`, mas **nenhum serviço publica** mensagens nela hoje.

### Tarefas

- [ ] Definir contrato de log (JSON):

  ```json
  {
    "service": "backend | ai",
    "level": "info | warn | error",
    "event": "analysis.created",
    "message": "...",
    "metadata": { "analysisId": "...", "userId": "..." },
    "timestamp": "2025-06-02T12:00:00.000Z"
  }
  ```

- [ ] **Backend:** criar módulo `src/services/logPublisher.ts`
  - Dependência: `amqplib`
  - Publicar em eventos: startup, login, análise criada, erro 5xx
  - Variáveis: `RABBITMQ_URL`, `LOG_QUEUE`

- [ ] **AI:** criar `app/services/log_publisher.py` (ou estender `logging.py`)
  - Dependência: `aio-pika` ou `pika`
  - Publicar em: início/fim de `/ai/analyze`, erros de scraping/LLM
  - Variáveis: `RABBITMQ_URL`, `LOG_QUEUE`

- [ ] Atualizar `docker-compose.yml`:
  - Adicionar `RABBITMQ_URL` e `LOG_QUEUE` nos serviços `api` e `ai`
  - `depends_on: rabbitmq` no serviço `api`

- [ ] Subir logging worker: `docker compose up logging-worker -d`
- [ ] Disparar uma análise e verificar arquivo em volume `logging_worker_logs` ou pasta `./logs`

### Critério de conclusão

- Mensagens aparecem na fila `fakeradar.logs` no RabbitMQ Management UI
- Arquivo `YYYY-MM-DD.log` é criado/atualizado pelo worker

---

## Fase 5 — Frontend conectado ao Backend

**Prioridade:** média-alta  
**Esforço estimado:** 4–8 h  
**Depende de:** Fase 3

### Problema

O frontend ainda é o template Vite. `useAnalysis.ts` importa de si mesmo (código quebrado). Não há integração com a API.

### Tarefas

- [ ] Criar `frontend/.env`:

  ```env
  VITE_API_URL=http://localhost:8080
  ```

- [ ] Criar camada de API (`src/lib/api.ts`):
  - `register`, `login`, `getMe`
  - `createAnalysis`, `listAnalyses`, `getAnalysis`, `deleteAnalysis`
  - Interceptor para JWT no `localStorage`

- [ ] Corrigir/reescrever `useAnalysis.ts` — hook que chama a API real, não mock local

- [ ] Implementar telas mínimas:
  - [ ] Login / Registro
  - [ ] Dashboard — formulário (URL ou texto) + submit
  - [ ] Resultado — score, verdict, claims, explanation
  - [ ] Histórico — lista de análises anteriores

- [ ] Configurar CORS: `FRONTEND_ORIGIN=http://localhost:5173` no backend (já suportado em `env.ts`)

- [ ] (Opcional) Adicionar serviço `frontend` ao `docker-compose.yml` com build multi-stage

- [ ] Rodar: `cd frontend && npm install && npm run dev`

### Critério de conclusão

- Usuário consegue registrar, logar, enviar texto e ver resultado na UI
- Histórico lista análises do usuário logado

---

## Fase 6 — Endurecer Docker Compose e documentação

**Prioridade:** baixa-média  
**Esforço estimado:** 2 h  
**Depende de:** Fases 1–5

### Tarefas

- [ ] Adicionar frontend ao `docker-compose.yml` (se ainda não estiver)
- [ ] Usar `env_file: .env` na raiz para todos os serviços que precisam de secrets
- [ ] Adicionar healthchecks nos serviços `api` e `ai`
- [ ] Garantir ordem de startup: `depends_on` com `condition: service_healthy` onde fizer sentido
- [ ] Atualizar `README.md` raiz (hoje só tem `# TAC-Projeto`) com:
  - Pré-requisitos
  - Como subir tudo: `docker compose up --build`
  - Como rodar em dev (serviços separados)
  - Mapa de portas
  - Variáveis de ambiente
- [ ] Alinhar `backend/README.md` (ainda menciona Spring Boot) com a stack real (Node/Express)

### Critério de conclusão

- Um dev novo consegue subir o projeto seguindo só o README
- `docker compose up --build` sobe todos os serviços sem passos manuais

---

## Fase 7 — Qualidade, testes e observabilidade

**Prioridade:** baixa (pode ser contínua)  
**Esforço estimado:** contínuo  
**Depende de:** Fases 1–6

### Tarefas

- [ ] Expandir testes do AI (`ai/tests/`) — mock de LLM e Fact Check API
- [ ] Adicionar testes de integração no backend (supertest ou similar)
- [ ] Teste E2E mínimo: register → login → analyze → get result
- [ ] Modo dev/mock no AI quando `LLM_API_KEY` não estiver setada (resposta fake para desenvolvimento sem custo)
- [ ] Rotação ou limite de tamanho dos arquivos de log do worker
- [ ] (Opcional) Métricas básicas — contagem de análises, tempo médio de resposta

---

## Ordem sugerida de execução

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
         (AI build)  (infra)  (E2E API) (logs)   (UI)     (docs)   (qualidade)
```

Se precisar de resultado visível rápido para demo:

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 5 (UI mínima) → Fase 4 → Fase 6
```

---

## Checklist rápido “está tudo rodando?”

```bash
# Na pasta projeto/
docker compose ps

curl http://localhost:8080/health          # → {"ok":true}
curl http://localhost:8000/ai/health       # → 200
open http://localhost:15672                # RabbitMQ UI
cd frontend && npm run dev                 # → http://localhost:5173
```

| Verificação                         | Comando / URL                              | Esperado        |
|-------------------------------------|--------------------------------------------|-----------------|
| Postgres saudável                   | `docker compose ps postgres`               | running         |
| RabbitMQ saudável                   | `:15672`                                   | login OK        |
| API no ar                           | `curl :8080/health`                        | `{"ok":true}`   |
| AI no ar                            | `curl :8000/ai/health`                     | 200             |
| Análise end-to-end                  | `POST :8080/api/analyses` com JWT          | 201 + JSON      |
| Logs no worker                      | inspecionar volume / pasta `logs/`         | linhas novas    |
| Frontend                            | `:5173`                                    | login + análise |

---

## Riscos e decisões em aberto

| Item | Risco | Decisão sugerida |
|------|-------|------------------|
| Custo de API (Anthropic) | Alto em testes repetidos | Modo mock em dev |
| Fact Check API | Pode não retornar claims para textos genéricos | Tratar `claims: []` na UI |
| spaCy / typer | Pode voltar a quebrar em upgrades | Fixar versões no `requirements.txt` após resolver |
| Secrets no compose | Senhas hardcoded (`yourpassword`) | OK para dev; trocar em produção |
| Frontend no Docker | Build mais lento | Dev local com `npm run dev`; Docker só para demo/prod |

---

## Registro de progresso

Use esta seção para marcar o que já foi feito (data + responsável):

| Data | Fase | O que foi feito | Responsável |
|------|------|-----------------|-------------|
| 2025-06-02 | 0 | .env.example, README, .gitignore, compose env_file | — |
| 2025-06-02 | 1 | Build AI (spaCy 3.8), .dockerignore, mock LLM | — |
| 2025-06-02 | 2 | Dockerfile backend (Prisma), stack Postgres/RabbitMQ/API | — |
| 2025-06-02 | 3 | Fluxo POST /api/analyses → AI validado | — |
| 2025-06-02 | 4 | Logging RabbitMQ (backend + AI → worker) | — |
| 2025-06-02 | 5 | Frontend React (auth, dashboard, detalhe) | — |
| 2025-06-02 | 6 | Healthchecks, frontend no compose, docs | — |

---

## Referências no repositório

- Orquestração: `docker-compose.yml`
- Backend → AI: `backend/src/services/aiClient.ts`
- Rotas de análise: `backend/src/routes/analyses.ts`
- Pipeline AI: `ai/app/routers/analysis.py`
- Consumer de logs: `logging-worker/src/index.ts`
- Exemplos de env: `*/.env.example`
