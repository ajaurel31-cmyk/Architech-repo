import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const MEAL_PROMPT = `You are a nutrition expert specializing in kidney transplant patient care. Generate 3 safe and healthy meal recommendations for a kidney transplant patient.

The meal type requested is: {MEAL_TYPE}

Consider these guidelines for kidney transplant patients:
1. Limit sodium (no added salt, avoid processed foods)
2. Monitor potassium intake
3. Avoid grapefruit and pomelo (interferes with immunosuppressants)
4. Focus on food safety - no raw/undercooked meats, eggs, or unpasteurized products
5. Limit saturated fats for heart health
6. Include adequate protein for healing
7. Avoid excessive sugar

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "meals": [
    {
      "name": "Meal name here",
      "description": "Brief appetizing description",
      "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
      "tips": "One transplant-specific tip for this meal"
    },
    {
      "name": "Second meal name",
      "description": "Brief appetizing description",
      "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
      "tips": "One transplant-specific tip for this meal"
    },
    {
      "name": "Third meal name",
      "description": "Brief appetizing description",
      "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
      "tips": "One transplant-specific tip for this meal"
    }
  ]
}

Make the meals practical, delicious, and easy to prepare. Only output valid JSON, nothing else.`

export async function POST(request: NextRequest) {
  try {
    const { mealType } = await request.json()

    if (!mealType) {
      return NextResponse.json({ error: 'Meal type is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    const prompt = MEAL_PROMPT.replace('{MEAL_TYPE}', mealType)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from Claude' }, { status: 500 })
    }

    // Parse the JSON response
    const mealsData = JSON.parse(textContent.text)

    return NextResponse.json(mealsData)
  } catch (error) {
    console.error('Meal generation error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Failed to parse meal data' }, { status: 500 })
    }

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 })
    }

    return NextResponse.json(
      { error: 'Failed to generate meals. Please try again.' },
      { status: 500 }
    )
  }
}
