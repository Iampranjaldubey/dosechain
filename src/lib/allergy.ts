/** Simple allergy ↔ medicine cross-check for common paediatric drug classes. */
const CLASSES: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "amoxycillin", "ampicillin", "augmentin", "cloxacillin", "co-amoxiclav"],
  sulfa: ["sulfa", "sulpha", "cotrimoxazole", "co-trimoxazole", "septran", "bactrim", "sulfamethoxazole"],
  nsaid: ["nsaid", "ibuprofen", "brufen", "diclofenac", "mefenamic", "meftal", "aspirin"],
  cephalosporin: ["cephalosporin", "cefixime", "cefpodoxime", "ceftriaxone", "cefuroxime", "cephalexin"],
  macrolide: ["macrolide", "azithromycin", "azithral", "erythromycin", "clarithromycin"],
};

export function allergyConflicts(medicine: string, allergies: string[]): string[] {
  const med = medicine.toLowerCase().trim();
  if (!med) return [];
  const hits: string[] = [];
  for (const raw of allergies) {
    const al = raw.toLowerCase().trim();
    if (!al) continue;
    if (med.includes(al) || al.includes(med)) { hits.push(raw); continue; }
    for (const names of Object.values(CLASSES)) {
      if (names.some((n) => al.includes(n)) && names.some((n) => med.includes(n))) { hits.push(raw); break; }
    }
  }
  return hits;
}
