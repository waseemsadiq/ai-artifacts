import { useState, useEffect } from 'react';
import { useNotifications } from '@notify-kit/react';
import { notifyKitConfig } from './notify-kit.config';

function App() {
  const {
    permission,
    isPushEnabled,
    isProcessing,
    statusMessage,
    togglePush,
    syncCategory,
  } = useNotifications(notifyKitConfig);

  // Category states (local + synced to backend)
  const [categories, setCategories] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('notifykit_categories');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default from config
    return notifyKitConfig.categories.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: cat.defaultEnabled }),
      {}
    );
  });

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem('notifykit_categories', JSON.stringify(categories));
  }, [categories]);

  // Toggle category
  const handleCategoryToggle = async (categoryId: string) => {
    const newValue = !categories[categoryId];
    setCategories((prev) => ({ ...prev, [categoryId]: newValue }));

    if (isPushEnabled) {
      await syncCategory(categoryId, newValue);
    }
  };

  // Get permission status class
  const getPermissionClass = () => {
    switch (permission) {
      case 'granted':
        return 'status-granted';
      case 'denied':
        return 'status-denied';
      default:
        return 'status-default';
    }
  };

  return (
    <div className="app">
      <div className="card">
        <h1>NotifyKit Example</h1>
        <p className="subtitle">Dual-path notification system demo</p>

        {/* Status Section */}
        <div className="section">
          <div className="section-title">Status</div>
          <div className="status-row">
            <span className="status-label">Permission</span>
            <span className={`status-value ${getPermissionClass()}`}>
              {permission}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Push Notifications</span>
            <span
              className={`status-value ${isPushEnabled ? 'status-enabled' : 'status-disabled'}`}
            >
              {isPushEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          {!isPushEnabled ? (
            <button
              className="btn-primary"
              onClick={() => togglePush(true)}
              disabled={isProcessing || permission === 'denied'}
            >
              {isProcessing ? 'Enabling...' : 'Enable Notifications'}
            </button>
          ) : (
            <button
              className="btn-danger"
              onClick={() => togglePush(false)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Disabling...' : 'Disable Notifications'}
            </button>
          )}

          {permission === 'denied' && (
            <p style={{ color: '#991b1b', fontSize: '0.875rem', textAlign: 'center' }}>
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>

        {/* Categories Section */}
        {isPushEnabled && (
          <div className="section" style={{ marginTop: '2rem' }}>
            <div className="section-title">Notification Categories</div>
            <div className="categories">
              {notifyKitConfig.categories.map((category) => (
                <div key={category.id} className="category-row">
                  <span className="category-name">{category.name}</span>
                  <div
                    className={`toggle ${categories[category.id] ? 'active' : ''}`}
                    onClick={() => handleCategoryToggle(category.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && <div className="status-message">{statusMessage}</div>}
      </div>

      <div className="footer">
        Powered by{' '}
        <a href="https://github.com/waseemsadiq/notify-kit" target="_blank" rel="noopener">
          NotifyKit
        </a>
      </div>
    </div>
  );
}

export default App;
