import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

const ConnectionStatus = ({ status, onRetry }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { icon: Wifi, color: 'text-green-600', bg: 'bg-green-100', text: 'Connected' };
      case 'failed':
        return { icon: WifiOff, color: 'text-red-600', bg: 'bg-red-100', text: 'Disconnected' };
      case 'testing':
        return { icon: Loader2, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Testing...' };
      default:
        return { icon: WifiOff, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Unknown' };
    }
  };

  const { icon: Icon, color, bg, text } = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${bg} ${color}`}>
      <Icon className={`w-4 h-4 ${status === 'testing' ? 'animate-spin' : ''}`} />
      <span>{text}</span>
      {status === 'failed' && (
        <button
          onClick={onRetry}
          className="ml-2 text-xs underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;