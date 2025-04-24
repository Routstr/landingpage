import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ModelTypeProps {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  badgeText?: string;
  isSelected?: boolean;
  onClick?: (id: string) => void;
}

export default function ModelTypeCard({
  id,
  name,
  description,
  count,
  icon,
  badgeText,
  isSelected = false,
  onClick,
}: ModelTypeProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer select-none",
        isSelected ? "border-white border-opacity-60" : ""
      )}
      onClick={() => onClick?.(id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <CardTitle className="text-white">{name}</CardTitle>
              <div className="flex items-center mt-1 space-x-2">
                <Badge variant="outline" className="bg-white/5 text-xs">
                  {count} models
                </Badge>
                {badgeText && (
                  <Badge variant="outline" className="bg-white/5 text-xs">
                    {badgeText}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {isSelected && (
            <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-black" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      {isSelected && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white bg-opacity-60"></div>
      )}
    </Card>
  );
} 