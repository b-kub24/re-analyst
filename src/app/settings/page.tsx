'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

interface Profile {
  full_name: string;
  email: string;
  subscription_tier: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealCount, setDealCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setProfile(profileData || { full_name: '', email: user.email || '', subscription_tier: 'free' });
      setDealCount(count || 0);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const tierLabels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter — $29/mo',
    pro: 'Pro — $99/mo',
    enterprise: 'Enterprise — $299/mo',
  };

  const tierLimits: Record<string, number> = { free: 3, starter: 15, pro: 999, enterprise: 999 };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-3xl font-bold text-white">Account Settings</h1>

          <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400">Full Name</label>
                <p className="mt-1 text-white">{profile?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400">Email</label>
                <p className="mt-1 text-white">{profile?.email}</p>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{tierLabels[profile?.subscription_tier || 'free']}</p>
                <p className="mt-1 text-sm text-gray-400">
                  {dealCount} / {tierLimits[profile?.subscription_tier || 'free']} deals used this month
                </p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {profile?.subscription_tier === 'free' ? 'Upgrade' : 'Manage Plan'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Security</h2>
            <button
              onClick={() => supabase.auth.resetPasswordForEmail(profile?.email || '')}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Change Password
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
