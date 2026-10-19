/**
 * Chromium Automation & CDP Engineering Studio
 * Expert systems interface for isolated filesystem storage (--user-data-dir),
 * per-profile proxy authentication tunnels, and strict state separation.
 */

import React, { useState, useEffect } from 'react';
import { BrowserProfile } from './automation/types';
import { Header } from './components/Header';
import { ProfileMatrix } from './components/ProfileMatrix';
import { ProfileModal } from './components/ProfileModal';
import { ProxyLab } from './components/ProxyLab';
import { CDPInspector } from './components/CDPInspector';
import { StorageSanitizer } from './components/StorageSanitizer';
import { CodeSynthesizer } from './components/CodeSynthesizer';
import { BrowserWorkspace } from './components/BrowserWorkspace';
import { apiFetch } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'profiles' | 'proxies' | 'cdp' | 'storage' | 'code'>('workspace');
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrowserProfile | null>(null);

  // Selected profile for code generation tab
  const [codeProfileId, setCodeProfileId] = useState<string | undefined>(undefined);
  const [workspaceProfileId, setWorkspaceProfileId] = useState<string | undefined>(undefined);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await apiFetch('/api/profiles');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data);
      }
    } catch (e) {
      console.error('Failed to load profiles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveProfile = async (profileData: Partial<BrowserProfile>) => {
    try {
      if (profileData.id) {
        // Update
        const res = await apiFetch(`/api/profiles/${profileData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Updated profile "${data.data.name}".`);
          fetchProfiles();
        }
      } else {
        // Create
        const res = await apiFetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Created profile "${data.data.name}".`);
          fetchProfiles();
        }
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      const res = await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('Profile deleted.');
        fetchProfiles();
      }
    } catch (e) {
      console.error('Failed to delete profile:', e);
    }
  };

  const handleTestProxy = async (profile: BrowserProfile) => {
    setActiveTab('proxies');
    showNotification(`Testing proxy for ${profile.name}...`);
  };

  const handleSanitizeLocks = async (id: string) => {
    try {
      const res = await apiFetch(`/api/profiles/${id}/locks/sanitize`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification(`Sanitized ${data.clearedFiles.length} Chromium lock files for profile.`);
      }
    } catch (e) {
      console.error('Sanitize locks error:', e);
    }
  };

  const handleQuickRun = (profile: BrowserProfile) => {
    setCodeProfileId(profile.id);
    setActiveTab('code');
  };

  const handleSelectProfileForCode = (profile: BrowserProfile) => {
    setCodeProfileId(profile.id);
    setActiveTab('code');
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-200 flex flex-col font-sans">
      {/* Top Bar Contract (Wordmark, 5 Clean Nav Links, 1 Primary Action) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewProfile={() => {
          setEditingProfile(null);
          setIsModalOpen(true);
        }}
      />

      {/* Ephemeral Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded shadow-xl text-xs font-mono flex items-center gap-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-370 w-full mx-auto px-4 sm:px-6 py-5">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            Loading Chromium profile environments...
          </div>
        ) : (
          <>
            {activeTab === 'workspace' && (
              <BrowserWorkspace
                profiles={profiles}
                selectedProfileId={workspaceProfileId}
                onSelectProfile={setWorkspaceProfileId}
                onEditProfile={(profile) => {
                  setEditingProfile(profile);
                  setIsModalOpen(true);
                }}
                onOpenTools={() => setActiveTab('profiles')}
              />
            )}
            {activeTab === 'profiles' && (
              <ProfileMatrix
                profiles={profiles}
                onSelectProfileForCode={handleSelectProfileForCode}
                onEditProfile={(p) => {
                  setEditingProfile(p);
                  setIsModalOpen(true);
                }}
                onDeleteProfile={handleDeleteProfile}
                onTestProxy={handleTestProxy}
                onSanitizeLocks={handleSanitizeLocks}
                onQuickRun={handleQuickRun}
              />
            )}

            {activeTab === 'proxies' && <ProxyLab />}

            {activeTab === 'cdp' && <CDPInspector />}

            {activeTab === 'storage' && (
              <StorageSanitizer
                profiles={profiles}
                onRefreshProfiles={fetchProfiles}
              />
            )}

            {activeTab === 'code' && (
              <CodeSynthesizer
                profiles={profiles}
                initialProfileId={codeProfileId}
              />
            )}
          </>
        )}
      </main>

      {/* Profile Create / Edit Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        initialProfile={editingProfile}
      />

      <footer className="border-t border-slate-800/80 bg-[#080c14] py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Field Browser workspace</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-cyan-300">Isolated profile session</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Persistent context</span>
            <span aria-hidden="true">·</span>
            <span>Profile-aware routing</span>
            <span aria-hidden="true">·</span>
            <span>Operator tools</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
