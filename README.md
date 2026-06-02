# FakeRadar

Detector de fake news com backend Node.js, serviço de AI (FastAPI), frontend React e logging assíncrono via RabbitMQ.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Compose v2)
- Node.js 22+ (desenvolvimento local do frontend/backend)
- Python 3.11+ (desenvolvimento local do AI)

## Início rápido (Docker)

```bash
cp .env.example .env
# Edite .env se tiver API keys; com AI_MOCK_LLM=true funciona sem chaves.

docker compose up --build
```

| Serviço         | URL                          |
|-----------------|------------------------------|
| API             | http://localhost:8080        |
| AI (Swagger)    | http://localhost:8000/docs   |
| RabbitMQ UI     | http://localhost:15672       |
| Frontend (dev)  | http://localhost:5173        |

Credenciais RabbitMQ (dev): usuário `fakeradar`, senha `yourpassword`.

## Variáveis de ambiente

### Raiz (`.env`) — usado pelo Docker Compose

| Variável            | Descrição                                      |
|---------------------|------------------------------------------------|
| `LLM_API_KEY`       | Chave Anthropic ou OpenAI                      |
| `FACT_CHECK_API_KEY`| Google Fact Check Tools API                    |
| `SERPER_API_KEY`    | Serper (busca web)                             |
| `MAIN_SERVER_SECRET`| Segredo compartilhado backend ↔ AI             |
| `AI_MOCK_LLM`       | `true` = respostas simuladas sem chamar LLM    |

### Como obter API keys

- **Anthropic (Claude):** https://console.anthropic.com/
- **Google Fact Check Tools:** https://developers.google.com/fact-check/tools/api
- **Serper:** https://serper.dev/

### Por serviço (desenvolvimento local)

```bash
cp backend/.env.example backend/.env
cp ai/.env.example ai/.env
cp logging-worker/.env.example logging-worker/.env
cp frontend/.env.example frontend/.env   # após Fase 5
```

## Desenvolvimento local (sem Docker)

```bash
# Infra
docker compose up postgres rabbitmq -d

# Backend
cd backend && npm install && npm run dev

# AI
cd ai && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python -m spacy download en_core_web_sm
uvicorn app.main:app --reload --port 8000

# Logging worker
cd logging-worker && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Plano de conserto

Veja [PLANO.md](./PLANO.md) para o roteiro fase a fase de integração e correções.

## Arquitetura

```
Frontend → Backend (8080) → AI (8000)
                ↓              ↓
           PostgreSQL    RabbitMQ → Logging worker
```
