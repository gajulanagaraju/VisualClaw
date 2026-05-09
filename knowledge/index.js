import { shangrilaBoracay } from './shangrila-boracay.js'
import { boracayIsland } from './boracay-island.js'
import { manila } from './manila.js'
import { awardCeremony } from './award-ceremony.js'
import { philippinesPractical } from './philippines-practical.js'
import { languageGuide } from './language-guide.js'
import { conferenceIntelligence } from './conference-intelligence.js'
export { cameraScenes } from './camera-scenes.js'

export const KNOWLEDGE_BASE = [
  conferenceIntelligence,
  shangrilaBoracay,
  boracayIsland,
  manila,
  awardCeremony,
  philippinesPractical,
  languageGuide,
].join('\n\n---\n\n')
