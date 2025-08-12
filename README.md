# Homebranch Web

Front end for a self-hosted E-Book management service

# Installation instructions
- Create a .env file containing the following variables
    - VITE_BACKEND_URL - The URL for the [homebranch backend](https://github.com/Hydraux/Homebranch) instance
    - VITE_AUTHENTICATION_URL - URL for the [authentication service](https://github.com/Hydraux/Authentication)

    - ALLOWED_HOST - CORS allowed hosts
    - CORS_ORIGIN - CORS origin
        - Example: `/https?:\/\/([A-Za-z0-9\-.]+)?(\.example-domain\.com)(?::\d+)?$/`
- Install dependencies with `npm install`
- Start server with `node react-router-serve ./build/server/index.js`