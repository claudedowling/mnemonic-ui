// Deterministic, subtle accent color per vault (repo), so notes from
// different projects are visually distinguishable in the list without
// relying on text alone. Moderate saturation/lightness so it reads in both
// light and dark themes without competing with the selection indicator.
const PALETTE = [
  'hsl(28 55% 45%)',
  'hsl(205 55% 45%)',
  'hsl(155 45% 40%)',
  'hsl(280 40% 50%)',
  'hsl(350 50% 50%)',
  'hsl(190 45% 42%)',
  'hsl(45 55% 42%)',
  'hsl(255 40% 55%)',
]

export function colorForProject(vault: string | undefined): string {
  if (!vault) return 'transparent'
  let hash = 0
  for (let i = 0; i < vault.length; i++) hash = (hash * 31 + vault.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function labelForProject(vault: string, globalVaultRepo: string): string {
  if (vault === globalVaultRepo) return 'Global'
  return vault.split('/').pop() ?? vault
}
