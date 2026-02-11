import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, getClientIdentifier } from '@/app/lib/rate-limit';
import { validateBase64Image } from '@/app/lib/validation';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You are a gout nutrition expert AI assistant for the GoutGuard app. You analyze food images (photos of meals, nutrition labels, restaurant menus, or ingredient lists) specifically for their impact on gout.

When analyzing food, provide a structured JSON response with the following fields:

{
  "foodName": "Name of the food or meal",
  "purineLevel": "low" | "moderate" | "high" | "very_high",
  "estimatedPurineMg": number (estimated mg of purines per typical serving),
  "servingSize": "description of serving size",
  "riskLevel": "Safe" | "Caution" | "Avoid" | "Strictly Avoid",
  "colorCode": "green" | "yellow" | "orange" | "red",
  "summary": "Brief 1-2 sentence summary of this food's impact on gout",
  "explanation": "Detailed explanation of why this food is good or bad for gout sufferers. Mention specific ingredients that are high or low in purines.",
  "duringFlare": "Advice specific to eating this during an active gout flare",
  "betweenFlares": "Advice for eating this between flares (intercritical period)",
  "alternatives": ["Array of 3-5 safer lower-purine alternatives if the food is moderate/high/very_high purine"],
  "keyIngredients": [
    {
      "name": "ingredient name",
      "purineLevel": "low" | "moderate" | "high" | "very_high",
      "note": "brief note"
    }
  ],
  "tips": ["Array of 1-3 practical tips for gout sufferers regarding this food"]
}

PURINE CLASSIFICATION GUIDELINES:
- Low (<100mg/100g): Most vegetables, fruits, dairy, eggs, bread, rice, pasta
- Moderate (100-200mg/100g): Beef, pork, chicken, turkey, salmon, tuna, crab, spinach, asparagus, mushrooms, lentils
- High (200-300mg/100g): Mackerel, trout, scallops, bacon, game meats, dried beans
- Very High (300+mg/100g): Organ meats (liver, kidney, sweetbreads), anchovies, sardines, herring, mussels, yeast extract

HIGH-RISK FOODS TO FLAG:
- Organ meats (liver, kidney, sweetbreads, brain)
- Shellfish (mussels, scallops, shrimp)
- Certain fish (anchovies, sardines, herring, mackerel)
- Red meat in large quantities
- Beer and spirits (alcohol increases uric acid)
- High-fructose corn syrup and sugary drinks
- Yeast extracts

FOODS TO RECOMMEND:
- Cherries and cherry juice (may reduce flares)
- Low-fat dairy (milk, yogurt — may lower uric acid)
- Most vegetables (even moderate-purine ones like spinach are generally OK)
- Whole grains
- Coffee (may help lower uric acid)
- Vitamin C rich foods (citrus, berries, peppers)
- Water (hydration is critical)
- Nuts and legumes in moderation

IMPORTANT RULES:
1. Always return valid JSON, no markdown formatting
2. Be specific about purine content — estimate mg per serving
3. If analyzing a multi-item meal, assess each component
4. Consider cooking methods (grilling vs boiling can affect purines)
5. Account for portion sizes in your risk assessment
6. Include the medical disclaimer that this is educational only
7. If the image is unclear or not food-related, indicate this in the response
8. For nutrition labels, calculate purine estimates based on protein content and ingredient list`;

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(`analyze:${clientId}`, {
    maxRequests: 20,
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
    const { images } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one image to analyze.' },
        { status: 400 }
      );
    }

    if (images.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 images allowed per analysis.' },
        { status: 400 }
      );
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      const validation = validateBase64Image(images[i]);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Image ${i + 1}: ${validation.errors.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build content array with images
    const content: Anthropic.MessageCreateParams['messages'][0]['content'] =
      [];

    for (const image of images) {
      const match = image.match(
        /^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/
      );
      if (!match) continue;

      const mediaType = match[1] === 'jpg' ? 'jpeg' : match[1];
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: `image/${mediaType}` as
            | 'image/jpeg'
            | 'image/png'
            | 'image/gif'
            | 'image/webp',
          data: match[2],
        },
      });
    }

    content.push({
      type: 'text',
      text: 'Analyze this food image for purine content and gout impact. Return your analysis as a JSON object following the format in your instructions.',
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    // Extract text response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to get analysis results.' },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from potential markdown code blocks
      let jsonText = textBlock.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      analysis = JSON.parse(jsonText);
    } catch {
      // If JSON parsing fails, return raw text wrapped in a structure
      analysis = {
        foodName: 'Food Analysis',
        purineLevel: 'moderate',
        estimatedPurineMg: 0,
        riskLevel: 'Caution',
        colorCode: 'yellow',
        summary: textBlock.text,
        explanation: textBlock.text,
        duringFlare: 'Consult your doctor during flares.',
        betweenFlares: 'Enjoy in moderation between flares.',
        alternatives: [],
        keyIngredients: [],
        tips: ['Consult with your healthcare provider for personalized advice.'],
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      disclaimer:
        'This analysis is for educational purposes only and is not a substitute for professional medical advice. Always consult your doctor or rheumatologist for personalized dietary guidance.',
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error:
          'Failed to analyze image. Please try again or use a clearer photo.',
      },
      { status: 500 }
    );
  }
}
