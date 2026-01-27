import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const KIDNEY_ANALYSIS_PROMPT = `You are a nutrition expert specializing in kidney health. Analyze this nutrition facts label/ingredients list and evaluate whether this food is appropriate for someone with kidney disease or reduced kidney function.

Consider these key factors for kidney health:
1. **Sodium** - Should be limited (aim for less than 2,000mg/day total)
2. **Potassium** - May need to be limited depending on kidney function
3. **Phosphorus** - Often needs to be restricted in kidney disease
4. **Protein** - May need moderation in earlier stages of kidney disease
5. **Added sugars** - Should be limited for overall health
6. **Phosphate additives** - Look for ingredients ending in "phosphate" or "phosphoric acid"

Provide your response in this exact format:

VERDICT: [safe/caution/avoid]

SUMMARY: [One sentence summary of your assessment]

ANALYSIS:
[Detailed analysis including:
- Key nutrients identified and their levels
- Specific concerns for kidney health
- Any problematic ingredients (especially phosphate additives)
- Recommendations for consumption
- Any positive aspects of the food for kidney health]

Be specific about the numbers you see and explain why they matter for kidney health. If you cannot read certain parts of the label clearly, mention that.`

export async function POST(request: NextRequest) {
  try {
    const { image, apiKey } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Extract base64 data and media type from data URL
    const matches = image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    const mediaType = matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64Data = matches[2]

    // Initialize Anthropic client with user's API key
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    // Call Claude with vision capabilities
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: KIDNEY_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract the text response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from Claude' }, { status: 500 })
    }

    const responseText = textContent.text

    // Parse the response
    const verdictMatch = responseText.match(/VERDICT:\s*(safe|caution|avoid)/i)
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=\n\n|ANALYSIS:)/is)
    const analysisMatch = responseText.match(/ANALYSIS:\s*([\s\S]+)$/i)

    const verdict = (verdictMatch?.[1]?.toLowerCase() || 'caution') as 'safe' | 'caution' | 'avoid'
    const summary = summaryMatch?.[1]?.trim() || 'Analysis complete.'
    const analysis = analysisMatch?.[1]?.trim() || responseText

    return NextResponse.json({
      verdict,
      summary,
      analysis,
    })
  } catch (error) {
    console.error('Analysis error:', error)

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: error.status || 500 })
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    )
  }
}
