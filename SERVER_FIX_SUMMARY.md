# Server Fix Summary

## Issues Resolved

1.  **Dependency Installation**: `yarn install` was failing due to a Node.js version incompatibility with the `cheerio` package.
    *   **Fix**: Ran `yarn install --ignore-engines` to bypass the strict version check.

2.  **Frontend/Backend Communication**: The frontend (Vite) was not configured to talk to the backend server.
    *   **Fix**: Added a proxy configuration to `vite.config.js` to forward `/api` requests to `http://localhost:3000`.

3.  **Tailwind CSS Configuration**: The project is using Tailwind CSS v4, but the PostCSS configuration was using the old v3 syntax.
    *   **Fix**: Updated `postcss.config.js` to use `@tailwindcss/postcss`.

## How to Run the App

1.  **Start the Backend**:
    ```bash
    yarn dev:server
    ```
    (Runs on port 3000)

2.  **Start the Frontend**:
    ```bash
    yarn dev
    ```
    (Runs on port 5173)

The app will be accessible at [http://localhost:5173](http://localhost:5173).
