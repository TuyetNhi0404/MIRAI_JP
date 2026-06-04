# MIRAI_JP Backend — production image
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts
COPY tsconfig.json global.d.ts ./
COPY src ./src
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production --ignore-scripts
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads
VOLUME ["/app/uploads"]
EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
