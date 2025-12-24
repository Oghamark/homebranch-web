FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build/client /usr/share/nginx/html

# Replace default nginx config to support client-side routing (React Router)
RUN rm /etc/nginx/conf.d/default.conf && \
    printf 'server {\n\
    listen       80;\n\
    server_name  _;\n\
\n\
    root   /usr/share/nginx/html;\n\
    index  index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80