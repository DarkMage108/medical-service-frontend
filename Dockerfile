FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_ALLOWED_HOST
ARG VITE_APP_NAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ALLOWED_HOST=$VITE_ALLOWED_HOST
ENV VITE_APP_NAME=$VITE_APP_NAME

RUN rm -f .env .env.local && npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
