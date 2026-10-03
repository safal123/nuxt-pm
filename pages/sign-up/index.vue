<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { watchDebounced } from "@vueuse/core";
import { toast } from "vue-sonner";
import { authClient } from "~/lib/auth-client";
import { signUpSchema } from "~/server/utils/schemas";
import { slugifySubdomain, subdomainError } from "~/utils/subdomain";

useHead({ title: "Create account — Northstar" });

const route = useRoute();
const { fetchSession } = useAuth();
const { enabled: subdomainsEnabled, appDomain, checkSubdomain, goToSubdomain } =
  useSubdomain();

const redirectUrl = computed(() =>
  typeof route.query.redirect_url === "string"
    ? route.query.redirect_url
    : "/w",
);

const submitting = ref(false);

const { handleSubmit, values, setFieldValue } = useForm({
  validationSchema: toTypedSchema(signUpSchema),
});

const subdomainEdited = ref(false);
watch(
  () => values.name,
  (name) => {
    if (subdomainEdited.value || !name || name.trim().length < 3) return;
    setFieldValue("subdomain", slugifySubdomain(name), false);
  },
);

const availability = ref<"idle" | "checking" | "available" | "taken">("idle");
watchDebounced(
  () => values.subdomain,
  async (value) => {
    if (!value || subdomainError(value)) {
      availability.value = "idle";
      return;
    }
    availability.value = "checking";
    try {
      const result = await checkSubdomain(value);
      if (result.subdomain === values.subdomain?.trim().toLowerCase()) {
        availability.value = result.available ? "available" : "taken";
      }
    } catch {
      availability.value = "idle";
    }
  },
  { debounce: 350 },
);

const onSubmit = handleSubmit(async (formValues) => {
  if (submitting.value) return;
  submitting.value = true;

  const { data, error } = await authClient.signUp.email({
    name: formValues.name,
    email: formValues.email,
    password: formValues.password,
    subdomain: formValues.subdomain,
  });

  if (error) {
    submitting.value = false;
    toast.error(error.message || "Could not create your account");
    return;
  }

  const session = await fetchSession();
  await goToSubdomain(
    session?.user?.subdomain ?? data?.user?.subdomain,
    redirectUrl.value,
  );
});

async function continueWithGoogle() {
  submitting.value = true;
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: redirectUrl.value,
    errorCallbackURL: "/sign-up",
    newUserCallbackURL: redirectUrl.value,
  });
  if (error) {
    submitting.value = false;
    toast.error(error.message || "Could not reach Google");
  }
}
</script>

<template>
  <AuthShell
    title="Create your account"
    subtitle="Start a Northstar workspace in a minute — Google or email."
  >
    <div class="space-y-5">
      <GoogleButton
        label="Continue with Google"
        :disabled="submitting"
        @click="continueWithGoogle"
      />
      <AuthDivider />

      <form class="space-y-4" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input
                type="text"
                class="h-11"
                autocomplete="name"
                placeholder="Ada Lovelace"
                v-bind="componentField"
                :disabled="submitting"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>Work email</FormLabel>
            <FormControl>
              <Input
                type="email"
                class="h-11"
                autocomplete="email"
                placeholder="you@company.com"
                v-bind="componentField"
                :disabled="submitting"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="subdomain">
          <FormItem>
            <FormLabel>Your workspace address</FormLabel>
            <FormControl>
              <div
                class="flex h-11 items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
              >
                <Input
                  type="text"
                  class="h-full border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autocomplete="off"
                  autocapitalize="none"
                  spellcheck="false"
                  placeholder="john"
                  v-bind="componentField"
                  :disabled="submitting"
                  @input="subdomainEdited = true"
                />
                <span
                  v-if="subdomainsEnabled"
                  class="shrink-0 pr-3 text-sm text-muted-foreground"
                >
                  .{{ appDomain }}
                </span>
              </div>
            </FormControl>
            <FormMessage />
            <p
              v-if="availability !== 'idle'"
              class="text-xs"
              :class="{
                'text-muted-foreground': availability === 'checking',
                'text-emerald-600 dark:text-emerald-400': availability === 'available',
                'text-destructive': availability === 'taken',
              }"
            >
              {{
                availability === "checking"
                  ? "Checking availability…"
                  : availability === "available"
                    ? "Available"
                    : "That subdomain is already taken."
              }}
            </p>
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input
                type="password"
                class="h-11"
                autocomplete="new-password"
                placeholder="At least 8 characters"
                v-bind="componentField"
                :disabled="submitting"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button
          type="submit"
          size="lg"
          class="h-11 w-full"
          :disabled="submitting"
        >
          {{ submitting ? "Creating account…" : "Create account" }}
        </Button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        Already have an account?
        <NuxtLink
          :to="{ path: '/sign-in', query: route.query }"
          class="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </NuxtLink>
      </p>
    </div>
  </AuthShell>
</template>
