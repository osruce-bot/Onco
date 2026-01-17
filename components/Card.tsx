
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action, icon, ...props }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col transition-colors ${className}`} {...props}>
      {(title || action || icon) && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gray-500 dark:text-gray-400 flex items-center">{icon}</span>}
            {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};
