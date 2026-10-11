# Matrix QR (prueba técnica Interseguro)

Dos APIs REST que se comunican por HTTP y un frontend de prueba:

- **go-api** (Go + Fiber): recibe una matriz, calcula su factorización QR y llama a node-api.
- **node-api** (Node.js + Express + TypeScript): calcula máximo, mínimo, promedio, suma y si las matrices son diagonales.
- **frontend** (React + Vite): login con Logto, entrada de la matriz y resultados.

## Documentación

- [Contrato de las APIs](docs/api-contract.md)
- [Arquitectura](docs/architecture.md)
- [Docker y docker-compose](docs/docker.md)
- README de cada servicio: [go-api](src/go-api/README.md), [node-api](src/node-api/README.md), [frontend](src/frontend/README.md)

## Comandos

```bash
make run-go run-node run-frontend   # desarrollo (cada uno en su terminal)
make check                          # lint + pruebas + regla de dependencias
make docker-up                      # las tres imágenes con docker compose
```
