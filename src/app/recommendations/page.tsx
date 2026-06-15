"use client";

import { useState } from "react";
import { personalizedRecommendations, PersonalizedRecommendationsOutput } from "@/ai/flows/personalized-recommendations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RecommendationsPage() {
  const [pastPurchases, setPastPurchases] = useState("Collar de oro, anillo de diamantes");
  const [viewingHistory, setViewingHistory] = useState("Pendientes de perlas, pulsera de plata");
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setRecommendations(null);

    try {
      const result = await personalizedRecommendations({
        pastPurchases,
        viewingHistory,
      });
      setRecommendations(result);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudieron generar las recomendaciones. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-24 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Recomendaciones Personalizadas</CardTitle>
          <CardDescription>
            Nuestro asesor de IA le sugerirá joyas basadas en su historial.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="past-purchases">Compras Anteriores</Label>
              <Textarea
                id="past-purchases"
                placeholder="Ej: Anillo de compromiso, aros de oro..."
                value={pastPurchases}
                onChange={(e) => setPastPurchases(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewing-history">Historial de Visualización</Label>
              <Textarea
                id="viewing-history"
                placeholder="Ej: Collares de plata, pulseras de tenis..."
                value={viewingHistory}
                onChange={(e) => setViewingHistory(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Generando..." : "Obtener Recomendaciones"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {isLoading && (
        <div className="mt-8 text-center">
            <p>Buscando las joyas perfectas para ti...</p>
        </div>
      )}

      {recommendations && (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Sugerencias para ti</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-line">{recommendations.recommendations}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
