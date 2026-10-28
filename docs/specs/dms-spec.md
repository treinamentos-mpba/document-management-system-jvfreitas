# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, limitado ao usuário informado.
- Interface React para upload, listagem e download.
- Armazenamento de arquivos em `backend/storage`, usando `multer` com `diskStorage`.
- Armazenamento em memória dos metadados durante a execução do processo.
- Testes automatizados dos contratos HTTP e das regras principais.

### Fora do escopo

- Provedores de armazenamento externos, nuvem ou banco de dados.
- Persistência ou recuperação dos metadados após reiniciar o backend.
- Autenticação, cadastro de contas, gestão de credenciais ou autorização robusta.
- Versionamento, compartilhamento entre usuários, edição e exclusão de documentos.
- Pré-visualização, conversão ou processamento do conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um único arquivo por requisição multipart. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo, com mais de um arquivo ou que excedam o limite configurado. |
| RF-03 | O sistema deve gerar um identificador único e um nome de armazenamento que não dependa do nome fornecido pelo cliente. |
| RF-04 | O sistema deve registrar nome original, tamanho em bytes, data/hora do upload, tipo MIME e identificador do usuário dono. |
| RF-05 | O sistema deve listar somente os documentos associados ao usuário identificado na requisição. Uma lista sem resultados deve retornar sucesso com uma lista vazia. |
| RF-06 | O sistema deve permitir baixar um documento existente somente quando ele pertencer ao usuário identificado na requisição. |
| RF-07 | O sistema deve responder com erro estruturado para entrada inválida, documento inexistente, arquivo indisponível e falha interna. |
| RF-08 | A interface deve apresentar estados de carregamento, sucesso e erro no upload e na listagem, e permitir baixar cada documento listado. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local por `multer.diskStorage`; nenhum serviço de armazenamento externo deve ser utilizado. |
| RNF-02 | O diretório padrão de armazenamento deve ser `backend/storage`, com possibilidade de configuração por variável de ambiente. |
| RNF-03 | Os metadados devem permanecer em memória e podem ser perdidos ao reiniciar o processo. |
| RNF-04 | O limite padrão de upload deve ser 10 MiB e deve ser configurável por ambiente. |
| RNF-05 | O backend deve validar entrada e erros nas fronteiras HTTP, sem expor stack traces, caminhos locais ou detalhes internos ao cliente. |
| RNF-06 | O nome físico do arquivo deve ser gerado pelo sistema; o nome original nunca deve ser usado como caminho de destino. |
| RNF-07 | O projeto deve manter a arquitetura simples `routes -> controllers -> services -> repositories`, sem dependência de camadas internas em Express ou React. |
| RNF-08 | A configuração operacional deve vir de variáveis de ambiente, com defaults documentados e adequados ao desenvolvimento local. |
| RNF-09 | Os testes de backend devem usar o runner nativo `node:test` e não devem depender de serviços externos. |

### Limitação de identidade

Nesta versão, a API recebe o identificador do usuário no cabeçalho `X-User-Id`. Esse valor serve apenas para separar os metadados no fluxo de demonstração; sem autenticação, o cliente pode declarar outro identificador. Portanto, essa separação não constitui controle de acesso seguro e não deve ser apresentada como proteção para produção. Uma futura autenticação deverá derivar a identidade de uma sessão ou token validado pelo backend, nunca confiar diretamente nesse cabeçalho.

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | UUID gerado pelo backend e usado nas rotas. |
| `originalName` | string | Público | Nome original informado no upload, tratado como dado não confiável. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data/hora de criação em ISO 8601 UTC. |
| `owner` | string | Público | Valor do cabeçalho `X-User-Id` associado ao documento. |
| `mimeType` | string | Público | Tipo MIME fornecido/detectado no upload; não deve ser tratado como conteúdo confiável. |
| `storageName` | string | Interno | Nome gerado para localizar o arquivo dentro do diretório de storage. Não deve ser retornado pela API. |

Os metadados são mantidos por um repositório em memória. O arquivo fica no filesystem local. Como não há persistência dos metadados, arquivos podem permanecer órfãos após reinicializações; limpeza e reconciliação automática ficam fora do escopo desta versão.

## 6. Contratos de API

### Convenções

- Rotas do backend: caminhos abaixo sem prefixo.
- Frontend no desenvolvimento: consumir as rotas com prefixo `/api`; o proxy do Vite remove esse prefixo e encaminha para o backend local.
- Requisições de upload, listagem e download devem incluir `X-User-Id` não vazio.
- Erros devem usar JSON no formato `{ "error": { "code": "...", "message": "..." } }`.
- Não retornar `storageName`, caminho absoluto, stack trace ou informações de outros usuários.

### `POST /upload`

- Content-Type: `multipart/form-data`.
- Campo obrigatório: `file` (um arquivo).
- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `201 Created`, corpo com os metadados públicos do documento.

Exemplo de resposta:

```json
{
  "id": "2f5c99d8-6ab7-4a2d-b632-f2476f60c958",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-28T12:00:00.000Z",
  "owner": "usuario-123",
  "mimeType": "application/pdf"
}
```

Erros esperados: `400` para arquivo ausente ou campos inválidos; `413` quando o arquivo exceder o limite; `500` para falha inesperada de gravação. Em falha após a criação parcial do arquivo, o backend deve remover o arquivo parcial quando possível.

### `GET /documents`

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, corpo `{ "documents": [...] }`, incluindo apenas os documentos do usuário; lista vazia quando não houver documentos.
- Cada item contém os metadados públicos definidos acima.
- Erros esperados: `400` para identificador ausente ou inválido; `500` para falha inesperada.

### `GET /documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, conteúdo binário do arquivo; enviar `Content-Disposition: attachment` com o nome original devidamente sanitizado para o cabeçalho.
- Se o documento não existir, não pertencer ao usuário ou o arquivo não estiver disponível, responder `404` com erro estruturado sem revelar qual condição ocorreu.
- Erros esperados: `400` para identificador inválido; `500` para falha inesperada de leitura.

### Erros comuns

| Status | Código | Condição |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Campo obrigatório ausente ou inválido. |
| 404 | `DOCUMENT_NOT_FOUND` | Documento inexistente, não pertencente ao usuário ou arquivo indisponível. |
| 413 | `FILE_TOO_LARGE` | Arquivo acima do limite configurado. |
| 500 | `INTERNAL_ERROR` | Falha não prevista, sem detalhes internos na resposta. |

## 7. Decisões arquiteturais

### Backend

Fluxo de dependência: `routes -> controllers -> services -> repositories`.

- `routes/`: registra `POST /upload`, `GET /documents` e `GET /documents/:id/download`; conecta middleware de upload e controllers.
- `controllers/`: interpreta parâmetros, cabeçalhos, arquivo e resultado; define status, cabeçalhos e corpo HTTP. Não contém regras de negócio nem acesso direto ao filesystem.
- `services/`: valida os casos de uso, aplica associação por usuário, coordena gravação/listagem/download e define erros de domínio sem depender de Express.
- `repositories/`: encapsula o repositório em memória dos metadados e o acesso aos arquivos no storage local. É o único limite que conhece os detalhes de persistência e paths.
- `multer`: configurado com `diskStorage`, destino local configurável, limite de tamanho e nome físico gerado pelo sistema. O original deve ser preservado apenas como metadado.
- `app.js`: compõe middleware, rotas e tratamento final de erros; mantém o endpoint de saúde existente.

### Frontend

- `services/`: funções `fetch` para upload, listagem e download usando `/api` e convertendo respostas de erro em mensagens tratáveis pela interface.
- `components/`: componentes reutilizáveis de upload, lista e ação de download.
- `pages/` ou `App.jsx`: composição da tela e estado de carregamento/erro/sucesso, sem lógica de filesystem ou regras de persistência.
- O frontend nunca deve construir paths locais nem assumir que o nome do arquivo garante seu tipo ou segurança.

### Configuração

| Variável | Default | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de arquivos; caminho relativo deve ser resolvido de forma previsível pelo backend. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite de tamanho do upload (10 MiB). |

## 8. Plano de execução

Estas etapas descrevem trabalho futuro. A criação desta especificação não executa nem altera arquivos de backend ou frontend.

1. Implementar repositórios para metadados em memória e arquivos locais, incluindo geração de ID/nome físico e configuração do storage.
2. Implementar serviços de upload, listagem e download com validação, isolamento lógico por `owner` e erros de domínio.
3. Implementar controllers, rotas, middleware `multer.diskStorage` e tratamento centralizado de erros, preservando `/health`.
4. Escrever testes de backend para sucesso, validações, limite de tamanho, isolamento por usuário, arquivo inexistente e falhas de persistência/leitura.
5. Implementar os serviços `fetch` e componentes React para upload, listagem, estados de interface e download.
6. Validar o proxy Vite `/api`, executar testes do backend e build do frontend, e atualizar instruções de execução/configuração se necessário.

## 9. Critérios de aceite

- Um upload válido grava o arquivo no diretório local e retorna metadados públicos com ID único.
- Upload sem arquivo e upload acima do limite retornam erros estruturados e não deixam arquivo parcial conhecido.
- A listagem retorna somente documentos associados ao `X-User-Id` da requisição.
- Download de documento do mesmo usuário retorna os bytes e um `Content-Disposition` seguro.
- Documento inexistente, de outro usuário ou sem arquivo físico não revela detalhes e retorna `404`.
- Nenhuma resposta pública inclui o nome interno de storage ou caminho do filesystem.
- A camada de serviços pode ser testada sem instanciar Express; o repositório encapsula detalhes de persistência.
- Frontend consome `/api` e apresenta sucesso/erro sem recarregar a página inteira.
- Testes backend (`npm test`) e build frontend (`npm run build`) passam.
