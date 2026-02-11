import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, getClientIdentifier } from '@/app/lib/rate-limit';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const VALID_PREFERENCES = [
  'standard',
  'vegetarian',
  'dairy-free',
  'gluten-free',
];

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(`meals:${clientId}`, {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });

  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { mealType, dietaryPreferences } = body;

    if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type.' },
        { status: 400 }
      );
    }

    const preferences = Array.isArray(dietaryPreferences)
      ? dietaryPreferences.filter((p: string) => VALID_PREFERENCES.includes(p.toLowerCase()))
      : ['standard'];

    const prompt = `Generate 5 low-purine ${mealType} meal recommendations for someone with gout.

Dietary preferences: ${preferences.join(', ')}

Return a JSON array of 5 meal objects with this EXACT structure:
[
  {
    "name": "Meal name",
    "purineLevel": "Low",
    "description": "Brief 1-2 sentence description",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["Step 1", "Step 2"],
    "goutTips": ["Tip 1 about why this is good for gout", "Tip 2"]
  }
]

IMPORTANT FORMAT RULES:
- "purineLevel" MUST be one of exactly: "Very Low", "Low", or "Moderate"
- "goutTips" MUST be an array of 1-3 tip strings
- "ingredients" MUST be an array of ingredient name strings
- "instructions" MUST be an array of step strings

GUIDELINES:
- All meals should be LOW purine (under 100mg per serving)
- Prioritize anti-inflammatory ingredients (cherries, berries, leafy greens, olive oil)
- Include hydrating foods when possible
- Favor low-fat dairy options (may help lower uric acid)
- Avoid: organ meats, shellfish, high-purine fish, beer, high-fructose corn syrup
- Include vitamin C rich ingredients when possible
- Keep recipes practical and achievable for home cooking
- Respect dietary preferences strictly
- Return ONLY valid JSON array, no markdown formatting`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to generate meal recommendations.' },
        { status: 500 }
      );
    }

    let meals;
    try {
      let jsonText = textBlock.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      const parsed = JSON.parse(jsonText);
      // Normalize each meal to match the expected frontend interface
      meals = (Array.isArray(parsed) ? parsed : []).map((m: Record<string, unknown>) => {
        // Normalize purineLevel to expected casing
        let purineLevel = String(m.purineLevel || 'Low');
        const pl = purineLevel.toLowerCase();
        if (pl === 'very low') purineLevel = 'Very Low';
        else if (pl === 'low') purineLevel = 'Low';
        else if (pl === 'moderate') purineLevel = 'Moderate';
        else purineLevel = 'Low';

        // Ensure goutTips is always an array
        let goutTips: string[];
        if (Array.isArray(m.goutTips)) {
          goutTips = m.goutTips.map(String);
        } else if (typeof m.goutTips === 'string') {
          goutTips = [m.goutTips];
        } else {
          goutTips = [];
        }

        return {
          name: String(m.name || 'Unnamed Meal'),
          purineLevel,
          description: String(m.description || ''),
          ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(String) : [],
          instructions: Array.isArray(m.instructions) ? m.instructions.map(String) : [],
          goutTips,
        };
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse meal recommendations. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      meals,
      mealType,
      disclaimer:
        'These meal suggestions are for informational purposes only. Consult your doctor or dietitian for personalized dietary advice.',
    });
  } catch (error) {
    console.error('Meals generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate meal recommendations. Please try again.' },
      { status: 500 }
    );
  }
}
