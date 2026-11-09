import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  CheckSquare,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MousePointerClick,
  Radar,
  ScrollText,
  Settings,
  Target,
  Users,
} from "lucide-react";

export interface ModuleDef {
  slug: string;
  title: string;
  icon: LucideIcon;
  phase: number;
  /** Implemented and usable now. */
  live: boolean;
  summary: string;
  capabilities: string[];
  /** External access this module will need (requested only when its phase starts). */
  dependencies: string[];
}

export const MODULES: ModuleDef[] = [
  {
    slug: "dashboard",
    title: "Executive Dashboard",
    icon: LayoutDashboard,
    phase: 1,
    live: true,
    summary: "Investment, approved commissions, net profit and efficiency at a glance.",
    capabilities: [],
    dependencies: [],
  },
  {
    slug: "product-radar",
    title: "Product Radar",
    icon: Radar,
    phase: 4,
    live: false,
    summary: "Finds, scores (0–100) and ranks affiliate products with an explained rationale.",
    capabilities: [
      "Catalogue from ClickBank and Digistore24 (official APIs / exports) plus manual entry",
      "Commercial potential score from demand, commission, competition, CPC, refund terms",
      "Ranking with reasons — never invented sales history",
    ],
    dependencies: ["ClickBank account + API key", "Digistore24 account + API key"],
  },
  {
    slug: "cpa-offers",
    title: "CPA Offers",
    icon: BadgeDollarSign,
    phase: 4,
    live: false,
    summary: "Filters offers by commission model and real reversal exposure.",
    capabilities: [
      "Filter by CPA, RevShare, hybrid, fixed USD",
      "Reversal risk analysis: refund window, chargeback policy, payment terms",
      "Country availability (US first, then international)",
    ],
    dependencies: ["Affiliate platform integrations (Phases 2–3)"],
  },
  {
    slug: "keyword-intelligence",
    title: "Keyword Intelligence",
    icon: KeyRound,
    phase: 5,
    live: false,
    summary: "Buying-intent keyword research with negatives, separating estimates from observed data.",
    capabilities: [
      "Long-tail, review, comparison, alternative and discount searches",
      "Volume, CPC range, competition, intent and recommended match type",
      "Negative keyword lists for informational traffic",
    ],
    dependencies: ["Google Ads API developer token (Keyword Planner)"],
  },
  {
    slug: "cpc-intelligence",
    title: "CPC Intelligence",
    icon: MousePointerClick,
    phase: 5,
    live: false,
    summary: "Maximum acceptable CPC from real unit economics, plus waste detection.",
    capabilities: [
      "Bid ceiling = (commission × (1 − reversal) − margin) × conversion rate",
      "Geo, device and hour comparisons",
      "Recalculated with observed data as it accumulates",
    ],
    dependencies: ["Google Ads API"],
  },
  {
    slug: "audience-intelligence",
    title: "Audience Intelligence",
    icon: Users,
    phase: 9,
    live: false,
    summary: "Location, age, gender, device and time-of-day performance by approved profit.",
    capabilities: [
      "Segments ranked by approved sales, CPA and net profit — not clicks",
      "Unknown/low-data segments kept visible, never auto-excluded",
      "Respects personalized-advertising limits for health products",
    ],
    dependencies: ["Google Ads API reporting"],
  },
  {
    slug: "landing-pages",
    title: "Landing Pages",
    icon: FileText,
    phase: 6,
    live: false,
    summary: "Mobile-first, original, compliant pages with affiliate disclosure.",
    capabilities: [
      "Original content, verifiable claims, no fake testimonials",
      "Disclosure, privacy policy, terms and contact pages",
      "English first, multi-language ready",
    ],
    dependencies: ["Domain for published pages"],
  },
  {
    slug: "campaign-manager",
    title: "Campaign Manager",
    icon: Megaphone,
    phase: 8,
    live: false,
    summary: "Prepares campaigns that are created PAUSED and only go live after approval.",
    capabilities: ["Campaigns, ad groups, responsive search ads, keywords, negatives", "Geo and language targeting"],
    dependencies: ["Google Ads API (OAuth2)"],
  },
  {
    slug: "google-ads",
    title: "Google Ads",
    icon: Target,
    phase: 8,
    live: false,
    summary: "Official Google Ads API connection: OAuth2, sync, rate-limit and error handling.",
    capabilities: ["Account linking via OAuth2", "Daily performance sync into the metrics ledger"],
    dependencies: ["Google Ads developer token (Basic access approval)", "OAuth client ID/secret", "Ads account"],
  },
  {
    slug: "sales-tracking",
    title: "Sales Tracking",
    icon: Gauge,
    phase: 7,
    live: false,
    summary: "Click IDs, GCLID, UTMs and postbacks, with de-duplicated sale lifecycle events.",
    capabilities: [
      "Visit → offer click → pending → approved / refunded / chargeback",
      "Outbound click is never counted as a sale",
      "Offline conversion upload to Google Ads",
    ],
    dependencies: ["Platform postback/IPN configuration"],
  },
  {
    slug: "profit-intelligence",
    title: "Profit Intelligence",
    icon: BarChart3,
    phase: 7,
    live: false,
    summary: "Confirmed profit by product, platform, campaign, keyword, country and device.",
    capabilities: ["Pending vs approved vs reversed revenue", "USD originals with BRL view at a dated rate"],
    dependencies: ["Sales tracking data"],
  },
  {
    slug: "ai-agent",
    title: "AI Marketing Agent",
    icon: Bot,
    phase: 10,
    live: false,
    summary: "Daily and weekly routines that produce evidence-backed recommendations.",
    capabilities: ["Every recommendation cites real metrics", "Decision log for every run"],
    dependencies: ["AI model API key"],
  },
  {
    slug: "approvals",
    title: "Approval Center",
    icon: CheckSquare,
    phase: 1,
    live: true,
    summary: "Nothing that spends money runs without an explicit, logged approval.",
    capabilities: [],
    dependencies: [],
  },
  {
    slug: "reports",
    title: "Reports",
    icon: ScrollText,
    phase: 10,
    live: false,
    summary: "Daily and weekly reports generated from the ledger.",
    capabilities: ["Daily report", "Weekly comparison and expansion opportunities"],
    dependencies: [],
  },
  {
    slug: "settings",
    title: "Settings",
    icon: Settings,
    phase: 1,
    live: true,
    summary: "Workspace, financial guardrails, currency and integrations.",
    capabilities: [],
    dependencies: [],
  },
];

export function moduleBySlug(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
