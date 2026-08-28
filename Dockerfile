# ── deps : node_modules propres ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── build : client Prisma + build Next standalone ────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* est figé PAR LE COMPILATEUR au build (pas au runtime, même pour
# une Server Action) : injecter la vraie URL ici est la SEULE façon de la
# changer. Un Secret k8s au runtime n'y changera jamais rien.
ARG NEXT_PUBLIC_APP_URL=https://habitcade.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Même contrainte que NEXT_PUBLIC_APP_URL ci-dessus : figé au build. Vide par
# défaut = AdBanner/AdSidebar ne chargent pas le script AdSense (no-op propre,
# voir isAdSenseConfigured() dans lib/ads.ts) tant que ce n'est pas fourni.
ARG NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=""
ENV NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=$NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID=""
ENV NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID=$NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID
ARG NEXT_PUBLIC_ADMOB_IOS_BANNER_ID=""
ENV NEXT_PUBLIC_ADMOB_IOS_BANNER_ID=$NEXT_PUBLIC_ADMOB_IOS_BANNER_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── run : image minimale, serveur standalone uniquement ──────────────────────
# Les migrations tournent depuis l'hôte/CI (`prisma migrate deploy`), pas ici.
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
USER node
CMD ["node", "server.js"]
