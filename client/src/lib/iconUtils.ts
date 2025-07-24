import { 
  Heart, 
  Smile, 
  Umbrella, 
  Baby, 
  Users, 
  User, 
  Calendar, 
  Stethoscope,
  Briefcase,
  Clock,
  Star,
  Gift
} from "lucide-react";

export const getIconComponent = (iconValue: string) => {
  const iconMap = {
    'stethoscope': Stethoscope,
    'smile': Smile,
    'umbrella': Umbrella,
    'baby': Baby,
    'heart': Heart,
    'users': Users,
    'user': User,
    'calendar': Calendar,
    'briefcase': Briefcase,
    'clock': Clock,
    'star': Star,
    'gift': Gift
  };
  
  return iconMap[iconValue as keyof typeof iconMap] || Calendar;
};