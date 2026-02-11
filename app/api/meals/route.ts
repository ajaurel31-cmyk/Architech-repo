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
      ? dietaryPreferences.filter((p: string) => VALID_PREFERENCES.includes(p))
      : ['standard'];

    const prompt = `Generate 5 low-purine ${mealType} meal recommendations for someone with gout.

Dietary preferences: ${preferences.join(', ')}

Return a JSON array of 5 meal objects with this structure:
[
  {
    "name": "Meal name",
    "description": "Brief 1-2 sentence description",
    "purineLevel": "low",
    "estimatedPurineMg": number (per serving),
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["Step 1", "Step 2", ...],
    "goutTips": "Specific tip about why this meal is good for gout",
    "servingSize": "1 serving description",
    "prepTime": "X minutes",
    "tags": ["low-purine", "anti-inflammatory", etc.]
  }
]

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
      meals = JSON.parse(jsonText);
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
