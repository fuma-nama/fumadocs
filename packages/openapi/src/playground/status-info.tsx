import { CircleCheck, CircleX } from 'lucide-react';

interface StatusInfo {
  description: string;
  color: string;
  icon: React.ElementType;
}

const statusMap: Record<number, StatusInfo> = {
  400: { description: 'Bad Request', color: 'text-red-500', icon: CircleX },
  401: {
    description: 'Unauthorized',
    color: 'text-red-500',
    icon: CircleX,
  },
  403: { description: 'Forbidden', color: 'text-red-500', icon: CircleX },
  404: {
    description: 'Not Found',
    color: 'text-fd-muted-foreground',
    icon: CircleX,
  },
  500: {
    description: 'Internal Server Error',
    color: 'text-red-500',
    icon: CircleX,
  },
};

export function getStatusInfo(status: number): StatusInfo {
  if (status in statusMap) {
    return statusMap[status];
  }

  if (status >= 200 && status < 300) {
    return {
      description: 'Successful',
      color: 'text-green-500',
      icon: CircleCheck,
    };
  }

  if (status >= 400) {
    return { description: 'Error', color: 'text-red-500', icon: CircleX };
  }

  return {
    description: 'No Description',
    color: 'text-fd-muted-foreground',
    icon: CircleX,
  };
}
