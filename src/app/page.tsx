import Link from "next/link";

const features = [
  { title: "AI Deal Scoring", desc: "Get instant AI-powered analysis and scoring for any commercial real estate deal. Identify risks and opportunities in seconds.", icon: "🤖" },
  { title: "Financial Modeling", desc: "Comprehensive pro forma with IRR, Cap Rate, DSCR, Cash-on-Cash, and Equity Multiple calculations.", icon: "📊" },
  { title: "Portfolio Dashboard", desc: "Track all your deals in one place. Monitor performance, compare opportunities, and manage your pipeline.", icon: "📋" },
  { title: "Export Reports", desc: "Generate professional Excel and PDF reports for investors, lenders, and stakeholders.", icon: "📄" },
];

const tiers = [
  { name: "Free", price: "$0", period: "/mo", features: ["3 deals per month", "Basic financial metrics", "Portfolio dashboard"], cta: "Get Started", href: "/signup", highlighted: false },
  { name: "Pro", price: "$49", period: "/mo", features: ["Unlimited deals", "AI-powered analysis", "Excel & PDF export", "Priority support"], cta: "Start Free Trial", href: "/signup?plan=pro", highlighted: true },
  { name: "Enterprise", price: "$199", period: "/mo", features: ["Everything in Pro", "Portfolio analytics", "API access", "Team collaboration", "Custom integrations"], cta: "Contact Sales", href: "/signup?plan=enterprise", highlighted: false },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-blue-500">RE</span> Analyst
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition">Features</Link>
            <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">Log in</Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm mb-6">
            ✨ AI-Powered CRE Analysis
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Underwrite Smarter.
            <span className="block bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">Close Faster.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            The all-in-one platform for commercial real estate professionals. Analyze deals with AI, model financials, and make data-driven investment decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-medium transition">
              Start Free Trial
            </Link>
            <Link href="#features" className="px-8 py-3 border border-gray-700 hover:border-gray-500 rounded-lg text-lg font-medium transition">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need to Analyze Deals</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">From initial screening to final investment memo, RE Analyst streamlines your entire underwriting workflow.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-center mb-12">Start free. Upgrade when you need more power.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div key={t.name} className={`p-6 rounded-xl border ${t.highlighted ? "bg-blue-950/50 border-blue-500" : "bg-gray-900 border-gray-800"}`}>
                {t.highlighted && <div className="text-xs font-semibold text-blue-400 mb-2">MOST POPULAR</div>}
                <h3 className="text-xl font-bold mb-1">{t.name}</h3>
                <div className="mb-4"><span className="text-4xl font-bold">{t.price}</span><span className="text-gray-400">{t.period}</span></div>
                <ul className="space-y-2 mb-6">
                  {t.features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">✓</span>{f}</li>))}
                </ul>
                <Link href={t.href} className={`block text-center py-2 rounded-lg font-medium transition ${t.highlighted ? "bg-blue-600 hover:bg-blue-500" : "border border-gray-700 hover:border-gray-500"}`}>{t.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Deal Analysis?</h2>
          <p className="text-gray-400 mb-8">Join thousands of CRE professionals who use RE Analyst to make smarter investment decisions.</p>
          <Link href="/signup" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-medium transition">
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">© 2024 RE Analyst. All rights reserved.</div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
