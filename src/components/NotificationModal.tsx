import React from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { NotificationData } from '../types';

interface NotificationModalProps {
  notification: NotificationData | null;
  onClose: () => void;
  onAction?: (action: 'confirm' | 'reject' | 'redo') => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ 
  notification, 
  onClose, 
  onAction 
}) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'verification':
        return <Info className="w-8 h-8 text-[#6366F1]" />;
      case 'completion':
        return <CheckCircle className="w-8 h-8 text-[#10B981]" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-[#EF4444]" />;
      default:
        return <Info className="w-8 h-8 text-[#6366F1]" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'verification':
        return 'border-[#6366F1]';
      case 'completion':
        return 'border-[#10B981]';
      case 'error':
        return 'border-[#EF4444]';
      default:
        return 'border-[#6366F1]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-[#1b263b] rounded-lg border-2 ${getBgColor()} max-w-md w-full`}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <div>
                <h3 className="text-[#f9fafb] text-lg font-semibold">
                  {notification.title}
                </h3>
                <p className="text-[#cbd5e1] text-sm">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#cbd5e1] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-[#cbd5e1] mb-6">
            {notification.message}
          </p>
          
          {notification.certificateId && (
            <div className="bg-[#415a77] p-3 rounded-lg mb-6">
              <p className="text-[#cbd5e1] text-sm">
                <span className="font-medium">Certificate ID:</span> {notification.certificateId}
              </p>
            </div>
          )}

          {notification.type === 'verification' && onAction && (
            <div className="flex space-x-3">
              <button
                onClick={() => onAction('confirm')}
                className="flex-1 bg-[#10B981] hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => onAction('redo')}
                className="flex-1 bg-[#6366F1] hover:bg-indigo-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Redo
              </button>
              <button
                onClick={() => onAction('reject')}
                className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Invalid
              </button>
            </div>
          )}
          
          {notification.type !== 'verification' && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#415a77] hover:bg-[#778da9] text-white py-2 px-6 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;