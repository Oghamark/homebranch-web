FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ARG VITE_AUTHENTICATION_URL=/auth
ARG VITE_ITEMS_PER_PAGE=24
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build/client /usr/share/nginx/html


# HomeBranch/readium adds upgrade-insecure-requests inside reader iframe CSP.
# On local HTTP installs this upgrades EPUB resource URLs to HTTPS and breaks images/styles.
RUN grep -RIl "upgrade-insecure-requests" /usr/share/nginx/html/assets | xargs -r sed -i 's/"upgrade-insecure-requests",//g'


RUN rm /etc/nginx/conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
