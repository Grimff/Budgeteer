# Budgeteer: the app only. The budget, bank data and Plaid tokens live in the /data volume;
# Plaid keys and the password come from the environment (.env). Nothing private is in this image.
FROM node:22-alpine
WORKDIR /app
COPY app/ ./
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
