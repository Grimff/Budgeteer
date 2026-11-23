# Budgeteer: the app only. The budget, bank data and Plaid tokens live in the /data volume;
# Plaid keys and the password come from the environment (.env). Nothing private is in this image.

# 1. Build the React screens (app/src → app/public/dist/app.js). Build tools stay in this stage.
FROM node:22-alpine AS build
WORKDIR /b
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tools/build.js tools/
COPY app/ app/
RUN node tools/build.js

# 2. The server: no npm packages, just the app and the built screens.
FROM node:22-alpine
WORKDIR /app
COPY app/ ./
RUN rm -rf src
COPY --from=build /b/app/public/dist ./public/dist
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
