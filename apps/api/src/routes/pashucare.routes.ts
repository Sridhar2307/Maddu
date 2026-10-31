import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { env } from "../config/env.js";

export const pashucareRouter = Router();

const FIRST_AID_KNOWLEDGE: Record<string, any> = {
  bloat: {
    title: "Ruminal Tympany / Bloat (உப்பசம் / కడుపు ఉబ్బరం)",
    urgency: "HIGH",
    symptoms: ["Distended left flank", "Restlessness and kicking at belly", "Difficulty breathing", "Mouth breathing with tongue protruding"],
    firstAid: [
      "Keep animal standing with head elevated. Do NOT allow animal to lie down.",
      "Administer 200-300 ml of vegetable oil (groundnut or mustard oil) or turpentine oil mixed with linseed oil as recommended by vet.",
      "Gently place a wooden bit or rope in the mouth to encourage salivation and chewing, which stimulates belching.",
      "Call emergency veterinary dispensary immediately if the animal exhibits severe distress."
    ],
    contraindications: "Never attempt drenching if animal is unconscious or choking.",
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
  },
  mastitis: {
    title: "Bovine Mastitis / Udder Infection (மடி நோய் / పొదుగు వాపు)",
    urgency: "MEDIUM_HIGH",
    symptoms: ["Swollen, hot, painful quarter/teat", "Clots, flakes or watery reddish milk", "Drop in milk yield", "Fever"],
    firstAid: [
      "Frequent manual stripping/milking out of the affected quarter every 2 hours to remove bacterial toxins.",
      "Apply cold water compresses or ice packs if udder is acutely hot and swollen.",
      "Do NOT mix milk from affected quarter with bulk tank milk.",
      "Contact veterinarian for prompt intramammary infusion and systemic antibiotics based on California Mastitis Test (CMT)."
    ],
    contraindications: "Do not inject caustic home remedies into the teat canal.",
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
  },
  fmd: {
    title: "Foot and Mouth Disease / FMD (கோமாரி நோய் / గాలికుంటు)",
    urgency: "CRITICAL_CONTAGIOUS",
    symptoms: ["High fever (104-106°F)", "Blisters/vesicles on tongue, gums, dental pad, and interdigital cleft of feet", "Excessive ropy salivation", "Severe lameness"],
    firstAid: [
      "Immediately isolate affected animal from healthy herd to prevent contagion.",
      "Wash mouth lesions with 1% potassium permanganate or 2% sodium bicarbonate solution.",
      "Wash foot lesions with 2% copper sulphate solution or clean antiseptic wash.",
      "Provide soft, easily digestible gruel (cooked ragi, rice kanji, green fodder) as oral lesions prevent chewing hard straw.",
      "Notify the local Government Veterinary Assistant Surgeon immediately. FMD is a notifiable disease."
    ],
    contraindications: "Do not move animals to public shandies or common grazing pastures.",
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
  },
  fever: {
    title: "High Fever / Pyrexia (காய்ச்சல் / జ్వరం)",
    urgency: "MEDIUM",
    symptoms: ["Dry muzzle", "Ears cold or excessively hot", "Shivering", "Loss of appetite and rumination", "Elevated rectal temp > 102.5°F"],
    firstAid: [
      "Move animal to a well-ventilated, shaded shed.",
      "Sponge forehead and neck with clean cool water.",
      "Offer fresh, cool drinking water enriched with electrolytes (ORS / jaggery + salt).",
      "Observe for tick infestation (suspect Theileriosis, Babesiosis or Anaplasmosis in crossbred cattle)."
    ],
    contraindications: "Do not administer human paracetamol or NSAIDs without veterinary dosage calculation.",
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
  },
  diarrhea: {
    title: "Calf Scours / Enteritis (கன்று வயிற்றுப்போக்கு)",
    urgency: "HIGH_IN_CALVES",
    symptoms: ["Watery yellowish or white dung", "Sunken eyes", "Dehydration and skin tenting", "Weakness / inability to stand"],
    firstAid: [
      "Hydration is critical: Administer oral rehydration salt (ORS) solution 1-2 litres every 4 hours.",
      "Keep calf warm and dry with clean paddy straw bedding.",
      "Do not withdraw milk completely; provide warm milk in small, frequent amounts alongside ORS.",
      "Call vet for antimicrobial treatment if dung contains blood or mucus."
    ],
    contraindications: "Never let a dehydrated calf go without electrolytes for more than 4 hours.",
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
  },
};

/**
 * GET /api/v1/health/symptoms/:key
 * Offline/cached first aid clinical reference with mandatory medical disclaimer
 */
pashucareRouter.get("/health/symptoms/:key", (req: Request, res: Response) => {
  const key = req.params.key.toLowerCase().trim();
  const guide = FIRST_AID_KNOWLEDGE[key];

  if (!guide) {
    return res.status(404).json({
      error: {
        code: "SYMPTOM_NOT_FOUND",
        message: `No first aid guide for '${key}'. Available: ${Object.keys(FIRST_AID_KNOWLEDGE).join(", ")}`,
      },
      availableTopics: Object.keys(FIRST_AID_KNOWLEDGE),
    });
  }

  return res.json({
    topic: key,
    guide,
    disclaimer: "Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions.",
    emergencyHelpline: env.HELPLINE_NUMBER,
  });
});

/**
 * GET /api/v1/health/helpline
 * Emergency contacts & 24x7 state veterinary assistance
 */
pashucareRouter.get("/health/helpline", (_req: Request, res: Response) => {
  return res.json({
    helpline: env.HELPLINE_NUMBER,
    hours: "24x7 Emergency Toll-Free",
    stateControlRooms: [
      { state: "Tamil Nadu", number: "1962", agency: "Mobile Veterinary Services" },
      { state: "Andhra Pradesh", number: "1962", agency: "YSR Sanchara Pashu Seva" },
      { state: "Telangana", number: "1962", agency: "Pashu Aarogya Seva" },
      { state: "Karnataka", number: "1962", agency: "Pashu Sanjeevini Ambulance" },
      { state: "Kerala", number: "1962", agency: "State Animal Disease Emergency Control" },
    ],
    standardOperatingProcedure: "For acute surgical, poisoning, or dystocia emergencies, dial 1962 for GPS-tracked mobile veterinary ambulance dispatch.",
  });
});

const vetRequestSchema = z.object({
  species: z.string().default("COW"),
  symptoms: z.string().min(5),
  photoUrls: z.array(z.string()).default([]),
});

/**
 * POST /api/v1/vet-requests
 * Submits a veterinary consultation / visit request
 */
pashucareRouter.post("/vet-requests", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = vetRequestSchema.parse(req.body);

    const vetRequest = await prisma.vetRequest.create({
      data: {
        userId: req.user!.id,
        species: input.species,
        symptoms: input.symptoms,
        photoUrls: JSON.stringify(input.photoUrls),
      },
    });

    return res.status(201).json({
      message: "Veterinary consultation request registered successfully",
      ticketRef: `DAH-VET-${new Date().getFullYear()}-${vetRequest.id.slice(0, 6).toUpperCase()}`,
      vetRequest: {
        ...vetRequest,
        photoUrls: JSON.parse(vetRequest.photoUrls),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/vet-requests
 * Lists requests (own requests for users, all requests for VET / ADMIN)
 */
pashucareRouter.get("/vet-requests", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isVetOrAdmin = req.user!.roles?.includes("VET") || req.user!.roles?.includes("ADMIN");
    const where = isVetOrAdmin ? {} : { userId: req.user!.id };

    const requests = await prisma.vetRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            district: true,
            state: true,
            phone: isVetOrAdmin,
          },
        },
      },
    });

    const parsed = requests.map((r: any) => ({
      ...r,
      photoUrls: JSON.parse(r.photoUrls || "[]"),
    }));

    return res.json({ count: parsed.length, requests: parsed });
  } catch (err) {
    next(err);
  }
});

const replySchema = z.object({
  reply: z.string().min(10),
});

/**
 * PATCH /api/v1/vet-requests/:id/reply
 * Allows registered VET or ADMIN to provide clinical reply
 */
pashucareRouter.patch(
  "/vet-requests/:id/reply",
  authenticate,
  requireRole("VET", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = replySchema.parse(req.body);

      const updated = await prisma.vetRequest.update({
        where: { id: req.params.id },
        data: {
          reply: input.reply,
          status: "ANSWERED",
          vetId: req.user!.id,
        },
      });

      return res.json({
        message: "Clinical response recorded successfully",
        vetRequest: {
          ...updated,
          photoUrls: JSON.parse(updated.photoUrls || "[]"),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
