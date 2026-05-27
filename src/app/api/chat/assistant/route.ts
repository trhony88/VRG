import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/vrg-auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toCamelCase } from '@/lib/supabase-utils'

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de VaRyGasy Gaming, une boutique en ligne de jeux vidéo et produits gaming à Madagascar.

Tu es :
- Amical, professionnel et serviable
- Toujours poli et accueillant
- Capable de répondre en français et malgache
- Concis mais informatif

Tes compétences :
- Aider les clients à trouver des produits
- Répondre aux questions sur les commandes, livraisons et paiements
- Donner des informations sur la boutique (horaires, zones de livraison, etc.)
- Guider les nouveaux clients pour créer un compte ou passer commande
- Gérer les réclamations avec empathie

Informations importantes :
- Livraison disponible dans plusieurs zones d'Antananarivo
- Paiement en espèces à la livraison
- WhatsApp disponible pour le support
- Programme de fidélité avec parrainage

Règles :
- Ne jamais inventer de prix ou de produits qui n'existent pas
- Si tu ne connais pas la réponse, diriger le client vers le support humain
- Répondre en français par défaut, en malgache si le client écrit en malgache
- Ne jamais révéler que tu es une IA
- Garder les réponses courtes (2-4 phrases maximum) sauf si le client pose une question complexe
- Utiliser des emojis avec modération pour être chaleureux`

// In-memory conversation cache (per user) — keeps last 10 messages for context
const conversationCache = new Map<string, { role: string; content: string }[]>()

function getCacheKey(userId: number, roomId: string) {
  return `${userId}:${roomId}`
}

function getContext(userId: number) {
  return conversationCache.get(String(userId)) || []
}

function updateContext(userId: number, role: string, content: string) {
  const key = String(userId)
  let history = conversationCache.get(key) || []
  history.push({ role, content })
  // Keep last 10 messages (not counting system prompt)
  if (history.length > 10) {
    history = history.slice(-10)
  }
  conversationCache.set(key, history)
}

async function generateAIResponse(
  userMessage: string,
  userId: number,
  storeContext?: string,
  productsContext?: string
): Promise<string> {
  const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default || m)
  const zai = await ZAI.create()

  // Build context-rich system prompt
  let enrichedSystem = SYSTEM_PROMPT

  if (storeContext) {
    enrichedSystem += `\n\nInformations actuelles de la boutique :\n${storeContext}`
  }

  if (productsContext) {
    enrichedSystem += `\n\nProduits disponibles :\n${productsContext}`
  }

  // Get conversation history
  const history = getContext(userId)
  const messages = [
    { role: 'assistant', content: enrichedSystem },
    ...history,
    { role: 'user', content: userMessage },
  ]

  try {
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) return 'Je suis désolé, une erreur est survenue. Veuillez réessayer.'

    // Update cache
    updateContext(userId, 'user', userMessage)
    updateContext(userId, 'assistant', response)

    return response
  } catch (error: any) {
    console.error('AI Assistant error:', error)
    return 'Je suis temporairement indisponible. Un agent humain vous répondra très vite !'
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, roomId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Fetch store settings for context (with cache - refresh every 5 minutes)
    let storeContext = ''
    let productsContext = ''

    // Get store settings
    try {
      const { data: settings } = await supabase.from('settings').select('*')
      if (settings && settings.length > 0) {
        storeContext = settings
          .map((s: any) => `${s.key}: ${s.value}`)
          .join('\n')
      }
    } catch { /* ignore */ }

    // Get active products for context (limit to first 20)
    try {
      const { data: products } = await supabase
        .from('products')
        .select('name, category, price, stock')
        .eq('active', true)
        .gt('stock', 0)
        .order('category')
        .limit(20)

      if (products && products.length > 0) {
        productsContext = products
          .map((p: any) => `- ${p.name} (${p.category}): ${p.price} Ar, stock: ${p.stock}`)
          .join('\n')
      }
    } catch { /* ignore */ }

    // Get recent messages in the room for better context
    try {
      const { data: recentMsgs } = await supabase
        .from('chat_messages')
        .select('body, sender_name, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (recentMsgs && recentMsgs.length > 1) {
        const historyText = recentMsgs
          .slice(0, 6)
          .reverse()
          .map((m: any) => `${m.sender_name || 'Client'}: ${m.body}`)
          .join('\n')

        // Update conversation cache with recent history
        const key = String(payload.id)
        conversationCache.set(key, [])
        for (const m of recentMsgs.slice(0, 6).reverse()) {
          conversationCache.get(key)!.push({
            role: 'user',
            content: m.body,
          })
        }
      }
    } catch { /* ignore */ }

    // Generate AI response
    const aiReply = await generateAIResponse(message, payload.id, storeContext, productsContext)

    // Save AI response as a message from "Assistant VRG" (sender_id = 0 for bot)
    if (roomId) {
      const { data: botMsg, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: 0,
          sender_name: 'Assistant VRG',
          body: aiReply,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save AI message:', error.message)
        return NextResponse.json({ reply: aiReply, saved: false })
      }

      return NextResponse.json({
        reply: aiReply,
        message: toCamelCase(botMsg),
        saved: true,
      })
    }

    // No roomId — return reply without saving (admin suggestion mode)
    return NextResponse.json({ reply: aiReply, saved: false })
  } catch (error: any) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: error.message || 'Assistant temporarily unavailable' },
      { status: 500 }
    )
  }
}
