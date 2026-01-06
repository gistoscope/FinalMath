import http from "http";

import { createApp } from "./app";
import { resolveDependencies } from "./registry";

const PORT = process.env.PORT || 9000;

let server: http.Server;

declare global {
  namespace Express {
    interface Request {
      User?: {
        id: string;
        username?: string;
        roleId: string;
      };
    }
  }
}

async function main() {
  try {
    resolveDependencies();

    const app = createApp();

    server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
    console.log("failed to start app");
    process.exit(1);
  }
}

main();
