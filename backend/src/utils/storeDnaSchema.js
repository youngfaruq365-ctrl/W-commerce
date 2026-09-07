const { z } = require('zod');

const dnaSchema = z.object({
  version: z.number().int().positive(),
  generatorVersion: z.string(),
  industry: z.string().min(1),
  niche: z.string().min(1),
  personality: z.string().min(1),
  catalogSize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),

  visual: z.object({
    colorSystem: z.string().min(1),
    typography: z.string().min(1),
    shapeLanguage: z.string().optional()
  }),

  layout: z.object({
    homepage: z.string().min(1),
    header: z.string().min(1),
    productGrid: z.string().min(1),
    productCard: z.string().optional()
  }),

  features: z.record(z.string(), z.boolean()).optional(),

  motion: z.object({
    profile: z.string().optional()
  }).optional(),

  commerce: z.object({
    cart: z.string().optional(),
    checkout: z.string().optional()
  }).optional()
});

const validateDna = (dna) => {
  return dnaSchema.parse(dna);
};

module.exports = {
  validateDna,
  dnaSchema
};
