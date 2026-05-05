FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
ARG VITE_API_URL=/api/v1
RUN VITE_API_URL=$VITE_API_URL npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy as a template; envsubst will render it at container start
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
# nginx:alpine's docker-entrypoint.sh automatically runs envsubst on
# /etc/nginx/templates/*.template → /etc/nginx/conf.d/ before starting nginx
CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]
