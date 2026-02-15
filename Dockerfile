FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ARG VITE_AUTHENTICATION_URL
ARG VITE_ITEMS_PER_PAGE
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build/client /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
