#!/bin/sh
# ============================================
# VaRyGasy Gaming - Docker Entrypoint
# ============================================
set -e

echo "============================================"
echo "  VaRyGasy Gaming - Démarrage"
echo "============================================"

# Vérifier que le .env existe
if [ ! -f .env ]; then
  echo "⚠️  Fichier .env introuvable !"
  echo "   Copie .env.example en .env et remplis les valeurs."
  echo "   Commande: cp .env.example .env"
  exit 1
fi

# Vérifier les variables Supabase
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://TON_PROJET.supabase.co" ]; then
  echo "⚠️  NEXT_PUBLIC_SUPABASE_URL n'est pas configuré dans .env"
  echo "   Modifie le fichier .env avec tes clés Supabase."
fi

echo "✅ Configuration OK"
echo "🚀 Démarrage de l'application sur le port ${PORT:-3000}..."
echo "============================================"

exec "$@"
