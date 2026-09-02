<script setup lang="ts">
import { CheckIcon } from "lucide-vue-next";

const { isSignedIn } = useAuth();
const interval = ref("yearly");
const startHref = computed(() => (isSignedIn.value ? "/dashboard" : "/sign-up"));

const plans = computed(() => {
  const yearly = interval.value === "yearly";

  return [
    {
      name: "Free",
      description: "A single workspace to try the board, archive, and activity.",
      price: 0,
      suffix: "forever",
      cta: isSignedIn.value ? "Open dashboard" : "Start free",
      featured: false,
      features: [
        "1 workspace, 3 projects",
        "Up to 5 members",
        "Board and table views",
        "Due dates, priority, and comments",
        "Archive and restore",
        "Activity on your own tasks",
        "Tracked workspace invites",
      ],
    },
    {
      name: "Team",
      description: "Unlimited projects and email you can actually track.",
      price: yearly ? 12 : 16,
      suffix: "per member / month",
      billed: yearly ? "Billed yearly" : "Billed monthly",
      cta: isSignedIn.value ? "Open dashboard" : "Start Team",
      featured: true,
      features: [
        "Everything in Free",
        "Unlimited projects and members",
        "Full workspace activity, filterable by project and task",
        "Custom branded emails and HTML preview",
        "Email send log for mail you send",
        "Default board or table, compact tables, notifications",
        "Archive lists, cards, and projects",
      ],
    },
    {
      name: "Business",
      description: "Several teams, one company — every workspace in Northstar.",
      price: yearly ? 24 : 32,
      suffix: "per member / month",
      billed: yearly ? "Billed yearly" : "Billed monthly",
      cta: isSignedIn.value ? "Open dashboard" : "Start Business",
      featured: false,
      features: [
        "Everything in Team",
        "Unlimited workspaces",
        "Activity and archive across every workspace",
        "Priority email sending",
        "SSO-ready with Clerk organizations",
        "Priority support",
      ],
    },
  ];
});

const faqs = [
  {
    q: "Can I stay on Free?",
    a: "Yes. Free is enough for one workspace, three projects, and five members — including board, table, archive, and invite email.",
  },
  {
    q: "What counts as a member?",
    a: "Anyone invited into the workspace. You are billed per person with access, not per project or archived board.",
  },
  {
    q: "What’s included for email?",
    a: "Free includes tracked workspace invites. Team and Business add custom templates, the send log, and HTML preview of what went out.",
  },
];
</script>

<template>
  <section id="pricing" class="scroll-mt-24 border-y border-border bg-muted/30 py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-medium text-primary">Pricing</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Start free. Scale when the team does.
        </h2>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          Plans follow the product: workspaces, boards, archive, activity, and
          email — not a generic feature list.
        </p>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3">
        <Tabs
          :model-value="interval"
          @update:model-value="interval = $event"
        >
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
        <p class="h-5 text-xs text-muted-foreground">
          <span v-if="interval === 'yearly'">Save 25% on Team and Business</span>
        </p>
      </div>

      <div class="mx-auto mt-12 grid max-w-5xl items-stretch gap-6 lg:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="relative flex flex-col rounded-xl border bg-card p-6 shadow-sm"
          :class="
            plan.featured
              ? 'border-primary shadow-md ring-1 ring-primary'
              : 'border-border'
          "
        >
          <div class="mb-4 flex h-6 items-center justify-center">
            <Badge v-if="plan.featured">Most popular</Badge>
          </div>

          <h3 class="text-lg font-semibold text-foreground">{{ plan.name }}</h3>
          <p class="mt-1 min-h-[40px] text-sm leading-6 text-muted-foreground">
            {{ plan.description }}
          </p>

          <p class="mt-6 flex items-baseline gap-1">
            <span class="text-4xl font-semibold tracking-tight text-foreground">
              ${{ plan.price }}
            </span>
            <span class="text-sm text-muted-foreground">{{ plan.suffix }}</span>
          </p>
          <p class="mt-1 h-5 text-xs text-muted-foreground">
            {{ plan.billed || "No credit card" }}
          </p>

          <Button
            as-child
            class="mt-6 w-full"
            :variant="plan.featured ? 'default' : 'outline'"
          >
            <NuxtLink :to="startHref">{{ plan.cta }}</NuxtLink>
          </Button>

          <ul class="mt-8 space-y-3 text-sm leading-6 text-foreground">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex gap-2.5"
            >
              <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{{ feature }}</span>
            </li>
          </ul>
        </article>
      </div>

      <dl class="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
        <div v-for="item in faqs" :key="item.q">
          <dt class="text-sm font-semibold text-foreground">{{ item.q }}</dt>
          <dd class="mt-2 text-sm leading-6 text-muted-foreground">{{ item.a }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
