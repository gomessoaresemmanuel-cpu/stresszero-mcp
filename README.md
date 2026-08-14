# StressZero MCP — v2

Serveur MCP expérimental pour une **réflexion qualitative sur la charge de travail**.

> **Statut : en développement.** Les anciennes fonctions de scoring individuel, d’analyse d’équipe et de prédiction sont suspendues. StressZero ne fournit ni diagnostic, ni thérapie, ni dépistage, ni triage et ne remplace pas un professionnel de santé.

## Outils

| Outil | Rôle |
|---|---|
| `get_stresszero_status` | Affiche le statut, les rôles et les limites publiques. |
| `reflect_workload` | Reformule des sujets ouverts et propose trois questions d’organisation, sans score ni classification. |

## Ressource

- `stresszero://frame` — source de vérité du cadre StressZero.

## Installation

```bash
npx -y stresszero-mcp
```

Aucune clé API n’est nécessaire pour cette version.

## Rôles

- **Emmanuel Gomes Soares** : fondateur, méthode EGS et outils. Il n’assure aucun accompagnement individuel.
- **Ingrid Averianov** : coach professionnelle. Elle assure tous les accompagnements individuels.

## Transparence

La version v2 rompt volontairement avec la v1 : aucun score de burnout, aucune prédiction et aucune analyse d’équipe. Le dépôt documente un prototype technique ; il ne revendique ni validation clinique ni résultat client.

## Développement

```bash
git clone https://github.com/gomessoaresemmanuel-cpu/stresszero-mcp.git
cd stresszero-mcp
npm install
npm run build
```

MIT — Emmanuel Gomes Soares, [StressZero Entrepreneur](https://stresszeroentrepreneur.fr)
