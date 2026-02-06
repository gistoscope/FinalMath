# Final Math

## Overview

Final Math is a comprehensive mathematics learning platform designed to provide interactive, step-by-step problem solving. It consists of a robust backend for math logic orchestration and a modern frontend workspace.

## Project Structure

This repository is organized into the following main components:

- **`backend/`**: The core API server.
  - Built with Node.js, Express, and Tsyringe.
  - Handles step orchestration, rules, session management, and JWT authentication.
  - Exposes a REST API for the frontend.
  - [Read more](backend/README.md)

- **`final-math-frontend/`**: The main frontend workspace (Nx Monorepo).
  - Contains the end-user React application (`final-math-frontend`).
  - Includes shared libraries (e.g., `lre`) for logic and UI components.
  - [Read more](final-math-frontend/README.md)

- **`react-viewer/`**: A standalone React viewer application.
  - Vite-based project focusing on rendering mathematical content using KaTeX.
  - Likely used for testing or specific rendering views.

- **`docs/`**: Project documentation, including API specs and product passports.

## Getting Started

### Prerequisites

- **Node.js**: (Ensure you have a compatible version, e.g., v20+)
- **pnpm**: This project uses pnpm for efficient package management.

### Installation

1. Clone the repository.
2. Install dependencies in the root:
   ```bash
   pnpm install
   ```

### Running the Application

**Backend:**
Navigate to the backend directory and run the development server:

```bash
cd backend
pnpm start:dev
```

The server typically runs on port 4201 or 4202 (check `.env` or logs).

**Frontend:**
Navigate to the frontend directory and start the Nx application:

```bash
cd final-math-frontend
npx nx serve final-math-frontend
```

## Docker Support

You can run the entire application stack using Docker Compose.

### Prerequisites

- Docker
- Docker Compose

### Running with Docker

To start the application in production mode:

```bash
docker-compose up --build -d
```

This will spin up the following services:

- **Frontend**: Accessible at [http://localhost:4200](http://localhost:4200)
- **Backend**: Accessible at [http://localhost:4201](http://localhost:4201)

### Configuration

The Docker setup is defined in `docker-compose.yml`.

- **Backend Data**: The backend service mounts `./backend/data` and `./backend/config` to persist data and configuration.
- **Microservices**: The `viewer` and `react-viewer` services are currently optional and commented out in the compose file. Uncomment them if needed.

## Documentation

For detailed documentation on the API and specific modules, please refer to the files in the `docs/` directory.
