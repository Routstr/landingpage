import { ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

export default function FeatureCard({ 
  title, 
  description, 
  icon,
  iconBgColor = 'bg-gray-800',
  iconColor = 'text-white'
}: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/50 p-6 transition-all hover:border-white/20 hover:bg-black relative">
      {/* Tech accent line */}
      <div className="absolute top-0 left-0 w-1/4 h-0.5 bg-gradient-to-r from-transparent to-white/20"></div>
      
      <div className={`mb-4 rounded-full ${iconBgColor} p-2.5 w-11 h-11 flex items-center justify-center`}>
        <div className={`w-5 h-5 ${iconColor}`}>
          {icon}
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      
      {/* Tech accent square */}
      <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-white/20"></div>
    </div>
  );
} 