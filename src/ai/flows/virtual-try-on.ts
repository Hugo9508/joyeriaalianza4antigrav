// virtual-try-on.ts
'use server';

/**
 * @fileOverview A flow to enable users to virtually try on jewelry using their device's camera.
 *
 * - virtualTryOn - A function that handles the virtual try-on process.
 * - VirtualTryOnInput - The input type for the virtualTryOn function, including the user's photo and jewelry details.
 * - VirtualTryOnOutput - The return type for the virtualTryOn function, providing a data URI of the generated image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VirtualTryOnInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jewelryType: z.enum(['necklace', 'earrings', 'ring']).describe('The type of jewelry to try on.'),
  jewelryStyle: z.string().describe('The style or description of the jewelry.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

const VirtualTryOnOutputSchema = z.object({
  generatedImageDataUri: z
    .string()
    .describe(
      'A data URI containing the base64 encoded image of the user wearing the virtual jewelry.'
    ),
});

export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}

const virtualTryOnPrompt = ai.definePrompt({
  name: 'virtualTryOnPrompt',
  input: {schema: VirtualTryOnInputSchema},
  output: {schema: VirtualTryOnOutputSchema},
  prompt: `You are an expert virtual stylist. Given a user's photo and a description of jewelry, 
generate an image of the user wearing the jewelry. Ensure the jewelry looks realistic and fits the user appropriately.

User Photo: {{media url=photoDataUri}}
Jewelry Type: {{{jewelryType}}}
Jewelry Style: {{{jewelryStyle}}}`,
});

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      prompt: [
        {media: {url: input.photoDataUri}},
        {
          text: `generate an image of this character wearing a ${input.jewelryStyle} ${input.jewelryType}`,
        },
      ],
      model: 'googleai/gemini-2.5-flash-image-preview',
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Failed to generate image with jewelry.');
    }

    return {generatedImageDataUri: media.url};
  }
);
