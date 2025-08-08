# Build

FROM node as build

WORKDIR /app

COPY package.json .
RUN npm i

COPY . .

RUN npm run build

# Serve

FROM caddy:alpine

COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
