import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const KIDNEY_ANALYSIS_PROMPT = `You are a nutrition expert specializing in post-kidney transplant care. Analyze this nutrition facts label/ingredients list and evaluate whether this food is appropriate for a kidney transplant patient.

CRITICAL - GRAPEFRUIT DETECTION:
Carefully scan ALL ingredients for ANY of these that interfere with immunosuppressant medications (tacrolimus, cyclosporine, sirolimus):
- Grapefruit, grapefruit juice, grapefruit extract, grapefruit oil
- Pomelo, pummelo, pomelo juice
- Seville orange, bitter orange, marmalade (often contains Seville orange)
- Starfruit (carambola)
- Tangelo (grapefruit hybrid)
- Citrus flavoring or natural citrus flavors (may contain grapefruit)

If ANY of these are detected, the verdict MUST be "avoid" and include a prominent drug interaction warning.

Consider these key factors for kidney transplant patients:
1. **Sodium** - Should be limited to help control blood pressure (aim for less than 2,000mg/day total)
2. **Potassium** - Monitor levels; some medications affect potassium balance
3. **Phosphorus** - May still need monitoring post-transplant
4. **Protein** - Adequate protein is important for healing, but not excessive amounts
5. **Added sugars** - Limit to prevent weight gain and diabetes (common post-transplant)
6. **Saturated fat** - Limit to protect heart health (immunosuppressants increase cardiovascular risk)
7. **Food safety** - Note any raw/undercooked concerns (immunosuppressed patients are at higher infection risk)

Provide your response in this exact format:

VERDICT: [safe/caution/avoid]

SUMMARY: [One sentence summary of your assessment for transplant patients]

ANALYSIS:

### Drug Interaction Warning
[If grapefruit, pomelo, starfruit, Seville orange, or tangelo detected: Display "⚠️ DANGER: This product contains [ingredient] which can cause dangerous interactions with immunosuppressant medications including tacrolimus (Prograf), cyclosporine (Neoral, Sandimmune), and sirolimus (Rapamune). DO NOT CONSUME." If none detected: "No known drug interactions detected."]

### Key Nutrients Identified
[List the nutrients and their levels from the label]

### Concerns for Transplant Patients
[Specific issues with this food for kidney transplant recipients]

### Early Post-Transplant (0-3 months)
[Specific recommendations for patients in the early recovery phase when immunosuppression is highest and the body is healing. Address food safety concerns, infection risks, and healing needs.]

### Late Post-Transplant (3+ months)
[Recommendations for patients in the maintenance phase, focusing on long-term health, weight management, cardiovascular health, and diabetes prevention.]

### Recommendation
[Overall guidance on whether and how to consume this food]

Be specific about the numbers you see and explain why they matter for transplant patients. If you cannot read certain parts of the label clearly, mention that.`

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured on server' }, { status: 500 })
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
