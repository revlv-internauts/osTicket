// resources/js/components/StatsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number | string;
}

export default function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card className="bg-card hover:bg-accent/50 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

