FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ARG VITE_AUTHENTICATION_URL
ARG VITE_ITEMS_PER_PAGE
ARG VITE_CLOUD_MODE
ARG VITE_PORTAL_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build/client /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 80
