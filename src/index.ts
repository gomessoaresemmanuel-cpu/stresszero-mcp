#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const FRAME = {
  status: 'development',
  position: 'Prévention non médicale de la surcharge et organisation du travail.',
  boundaries: [
    'Ni diagnostic, ni thérapie, ni dépistage, ni triage.',
    'Aucun score de burnout, aucune prédiction et aucune analyse individuelle ou d’équipe.',
    'Ne remplace pas un professionnel de santé.',
  ],
  roles: {
    Emmanuel: 'Fondateur — vision, méthode EGS et outils. Aucun accompagnement individuel.',
    Ingrid: 'Coach professionnelle — tous les accompagnements individuels.',
  },
}

const server = new McpServer(
  { name: 'stresszero-mcp', version: '2.0.0' },
  { capabilities: { logging: {} } },
)

server.registerTool(
  'get_stresszero_status',
  {
    title: 'StressZero — état et limites',
    description: 'Retourne le statut de développement, les rôles et le cadre non médical de StressZero.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify(FRAME, null, 2) }],
  }),
)

server.registerTool(
  'reflect_workload',
  {
    title: 'Réflexion qualitative sur la charge',
    description:
      "Reformule des éléments de charge auto-déclarés et propose des questions d'organisation. " +
      'Aucun score, aucune classification et aucune conclusion médicale.',
    inputSchema: {
      open_loops: z.array(z.string().min(1).max(300)).max(20).default([]).describe('Sujets professionnels encore ouverts'),
      recovery_observation: z.string().max(1000).optional().describe('Observation libre sur la récupération'),
      decision_load: z.string().max(1000).optional().describe('Observation libre sur la charge décisionnelle'),
      language: z.enum(['fr', 'en']).default('fr').optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ open_loops, recovery_observation, decision_load, language }) => {
    const fr = (language ?? 'fr') === 'fr'
    const response = fr
      ? {
          synthese: {
            sujets_ouverts: open_loops,
            recuperation: recovery_observation || 'Non renseignée',
            decisions: decision_load || 'Non renseignée',
          },
          questions: [
            'Quel sujet peut être fermé, délégué ou planifié aujourd’hui ?',
            'Quelle limite protégerait une vraie coupure cette semaine ?',
            'Quelle décision peut attendre plutôt que consommer ta marge maintenant ?',
          ],
          cadre: FRAME.boundaries,
        }
      : {
          summary: {
            open_loops,
            recovery: recovery_observation || 'Not provided',
            decisions: decision_load || 'Not provided',
          },
          questions: [
            'Which item can be closed, delegated or scheduled today?',
            'Which boundary would protect a real break this week?',
            'Which decision can wait instead of consuming your margin now?',
          ],
          frame: FRAME.boundaries,
        }
    return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] }
  },
)

server.registerResource(
  'stresszero-frame',
  'stresszero://frame',
  {
    title: 'Cadre StressZero',
    description: 'Source de vérité publique sur le statut, les rôles et les limites.',
    mimeType: 'application/json',
  },
  async uri => ({
    contents: [{ uri: uri.href, text: JSON.stringify(FRAME, null, 2) }],
  }),
)

server.registerPrompt(
  'workload_reflection',
  {
    title: 'Réflexion sur la charge',
    description: "Questions d'organisation sans score ni conclusion médicale.",
    argsSchema: {
      language: z.enum(['fr', 'en']).default('fr'),
    },
  },
  ({ language }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: language === 'fr'
          ? "Aide-moi à lister mes sujets ouverts, observer ma récupération et choisir une seule action d'organisation. Ne me classe pas et ne pose aucune conclusion médicale."
          : 'Help me list open loops, observe recovery and choose one organizational action. Do not classify me or make any medical conclusion.',
      },
    }],
  }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('StressZero MCP v2 running — qualitative workload reflection only')
