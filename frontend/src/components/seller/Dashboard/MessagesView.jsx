import React from 'react';
import GXEmptyState from '../../shared/ui/GXEmptyState';

const MessagesView = ({ messages }) => {
  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
      <h1 className="text-3xl font-extrabold text-black mb-6">Customer Messages</h1>
      {messages?.length > 0 ? (
        <div className="bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)]">
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-black">{msg.senderName || msg.sender?.name || 'Customer'}</span>
                <span className="text-xs text-[var(--text-muted)]">{new Date(msg.timestamp || msg.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] truncate">
                {msg.content?.includes('[Audio:') ? '🎵 Audio Message' : 
                 msg.content?.includes('[Image:') ? '🖼️ Image Message' : 
                 (msg.content || 'Message content...')}
              </p>
            </div>
          ))}
        </div>
        ) : (
          <GXEmptyState 
            title="No unread messages" 
            description="Message center loaded. You have no new messages from customers."
          />
        )}
    </div>
  );
};

export default MessagesView;
